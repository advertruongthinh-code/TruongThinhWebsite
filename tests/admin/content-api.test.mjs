import assert from "node:assert/strict";
import { test } from "node:test";

// Đường lưu và phục vụ nội dung editor trong Worker (cms-editor R8, R10) chạy trong CI: D1 và ASSETS giả trong bộ nhớ.
// HTMLRewriter là global của Workers, Node không có: thay bằng bản không đổi gì (phần rewrite do content-worker.e2e kiểm).
globalThis.HTMLRewriter = class {
  on() {
    return this;
  }

  transform(response) {
    return response;
  }
};
const { default: worker } = await import("../../src/worker/index.js");

const ORIGIN = "http://127.0.0.1:8788";
const SOURCE = "<!doctype html><html><head><title>Gốc</title></head><body><main><h1>Xin chào</h1><p>Đoạn</p></main></body></html>";
const CARD = "signage-raised-letters-01";

function fakeDb({ raceOnUpdate = false } = {}) {
  const rows = new Map();
  const audit = [];
  const db = {
    rows,
    audit,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.startsWith("SELECT content_json FROM pages")) return { content_json: JSON.stringify({ vi: {}, en: {} }) };
              if (sql.startsWith("SELECT edits_json")) return rows.get(values[0]) ?? null;
              throw new Error(`unexpected first(): ${sql}`);
            },
            async run() {
              if (sql.startsWith("INSERT INTO audit_log")) {
                audit.push(values);
                return { meta: { changes: 1 } };
              }
              const [edits_json, anchors_json, updated_at, updated_by, page, base] = values;
              if (sql.startsWith("UPDATE page_edits")) {
                if (raceOnUpdate || rows.get(page)?.updated_at !== base) return { meta: { changes: 0 } };
              } else if (rows.has(page)) return { meta: { changes: 0 } };
              rows.set(page, { edits_json, anchors_json, updated_at, updated_by });
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
  return db;
}

// ASSETS: trang nguồn có ETag; trang card tĩnh trả 304 khi ETag khớp, như Workers Static Assets.
function fakeAssets() {
  return {
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const html = { "content-type": "text/html; charset=utf-8", etag: '"static"', "content-length": "999" };
      if (pathname.startsWith("/residential/") || pathname === "/") return new Response(SOURCE, { headers: html });
      if (pathname === `/vi/advertising-products/p/${CARD}/` || pathname === `/en/advertising-products/p/${CARD}/`) {
        if (request.headers.get("if-none-match") === '"static"') return new Response(null, { status: 304, headers: html });
        return new Response(request.method === "HEAD" ? null : "<html><head></head><body>card</body></html>", { headers: html });
      }
      return new Response("Not Found", { status: 404, headers: { "content-type": "text/html" } });
    },
  };
}

const env = (db = fakeDb()) => ({ DB: db, ASSETS: fakeAssets(), CMS_LOCAL_ADMIN_EMAIL: "admin@localhost" });
const call = (environment, path, method = "GET", body, headers = {}) => worker.fetch(new Request(`${ORIGIN}${path}`, {
  method,
  headers: { origin: ORIGIN, ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
  body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
}), environment);
const text = { t0: { vi: "Chào mới", en: "New hello" } };

test("content API: 501 không D1, 404 trang lạ, 405, 400 JSON hoặc nháp sai, 413 body quá lớn", async () => {
  assert.equal((await call({ ...env(), DB: undefined }, "/api/admin/content/home")).status, 501);
  const environment = env();
  assert.equal((await call(environment, "/api/admin/content/blog")).status, 404);
  assert.equal((await call(environment, "/api/admin/content/%E0")).status, 404);
  assert.equal((await call(environment, "/api/admin/content/residential", "POST", {})).status, 405);
  assert.equal((await call(environment, "/api/admin/content/residential", "PUT", "{")).status, 400);
  assert.equal((await call(environment, "/api/admin/content/residential", "PUT", { edits: { text: { t0: { vi: "", en: "x" } } } })).status, 400);
  const large = await call(environment, "/api/admin/content/residential", "PUT", { edits: {} }, { "content-length": String(600 * 1024) });
  assert.equal(large.status, 413);
});

test("content API: lưu, đọc lại, 409 khi base cũ hoặc ghi đua, audit có khóa", async () => {
  const db = fakeDb();
  const environment = env(db);
  const saved = await call(environment, "/api/admin/content/residential", "PUT", { edits: { text }, baseUpdatedAt: null, anchors: { t0: "Xin chào" } });
  assert.equal(saved.status, 200);
  const { updatedAt } = await saved.json();
  assert.deepEqual((await (await call(environment, "/api/admin/content/residential")).json()).edits.text, text);
  assert.deepEqual(JSON.parse(db.audit[0][5]).keys, ["t0"]);
  const stale = await call(environment, "/api/admin/content/residential", "PUT", { edits: { text }, baseUpdatedAt: "2000-01-01T00:00:00.000Z" });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).updatedBy, "admin@localhost");
  // Hai người cùng base: UPDATE có điều kiện không đổi dòng nào thì 409, không ghi đè ngầm.
  const race = env(fakeDb({ raceOnUpdate: true }));
  race.DB.rows.set("residential", db.rows.get("residential"));
  assert.equal((await call(race, "/api/admin/content/residential", "PUT", { edits: { text }, baseUpdatedAt: updatedAt })).status, 409);
  // Dấu editor thấy lúc sửa khác nguồn hiện tại: trang đã đổi bản, không lưu.
  const drift = await call(environment, "/api/admin/content/residential", "PUT", { edits: { text }, baseUpdatedAt: updatedAt, anchors: { t0: "Chữ cũ" } });
  assert.equal(drift.status, 400);
});

test("trang VI có nội dung đã lưu: bỏ ETag file tĩnh; nháp rỗng thì phục vụ nguyên file tĩnh", async () => {
  const environment = env();
  await call(environment, "/api/admin/content/residential", "PUT", { edits: { text }, baseUpdatedAt: null });
  const page = await call(environment, "/vi/residential/");
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("etag"), null);
  assert.match(await page.text(), /Chào mới/);
  const { updatedAt } = await (await call(environment, "/api/admin/content/residential")).json();
  await call(environment, "/api/admin/content/residential", "PUT", { edits: {}, baseUpdatedAt: updatedAt });
  const empty = await call(environment, "/vi/residential/");
  assert.equal(empty.headers.get("etag"), '"static"');
  assert.doesNotMatch(await empty.text(), /Chào mới|data-cms-key/);
});

test("card đã sửa: trang p/<id> hỏi lại bằng ETag cũ nhận bản mới, id lạ không 500, card ngoài catalog bị từ chối", async () => {
  const environment = env();
  const card = {
    titleVi: "Tên", titleEn: "Name", descriptionVi: "Mô tả", descriptionEn: "Description",
    productIds: ["signage/aluminium-signs-facades"], coverMediaId: "m1",
    mediaItems: [{ id: "m1", kind: "image", src: "/assets/content/c.webp", width: 10, height: 10, altVi: "", altEn: "" }],
  };
  assert.equal((await call(environment, "/api/admin/content/advertising", "PUT", { edits: { cards: { "khong-co": card } }, baseUpdatedAt: null })).status, 400);
  assert.equal((await call(environment, "/api/admin/content/advertising", "PUT", { edits: { cards: { [CARD]: card } }, baseUpdatedAt: null })).status, 200);
  const page = await call(environment, `/vi/advertising-products/p/${CARD}/`, "GET", undefined, { "if-none-match": '"static"' });
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("etag"), null);
  assert.equal(page.headers.get("content-length"), null);
  for (const id of ["constructor", "__proto__", "toString"]) {
    assert.equal((await call(environment, `/vi/advertising-products/p/${id}/`)).status, 404, id);
  }
});
