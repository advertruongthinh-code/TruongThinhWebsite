import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { after, before, test } from "node:test";

// Lõi CMS (cms-editor R3, R4, R8): gắn khóa theo thứ tự nguồn, áp nháp chữ, ảnh, danh sách, bản sao marquee.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const FIXTURE = `<!doctype html><html><head><title>Gốc</title><meta name="description" content="Mô tả" data-en-content="About"></head><body>
<main>
  <h1><span data-vi="Xin chào" data-en="Hello">Xin chào</span></h1>
  <div class="hero-slides">
    <figure class="hero-slide is-active"><img src="/a.webp" alt="A" width="10" height="10"></figure>
    <figure class="hero-slide"><picture><source srcset="/b.jxl"><img data-src="/b.webp" srcset="/b-480.webp 480w" alt="B" data-en-alt="B en"></picture></figure>
  </div>
  <div class="detail-gallery__slides">
    <figure class="detail-gallery__item"><img src="/g1.webp" alt="G1"><figcaption data-en="One">Một</figcaption></figure>
    <figure class="detail-gallery__item"><img src="/g2.webp" alt="G2"><figcaption data-en="Two">Hai</figcaption></figure>
  </div>
  <div class="marquee-line"><span>Chữ chạy</span></div>
  <div class="marquee-line" aria-hidden="true"><span>Chữ chạy</span></div>
</main></body></html>`;

let browser;
let page;
const run = async (fn, arg) => {
  await page.setContent(FIXTURE);
  await page.addScriptTag({ path: "src/admin/cms-core.js" });
  return page.evaluate(fn, arg);
};

before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  page = await browser.newPage();
});
after(() => browser?.close());

test("stamp gắn khóa theo thứ tự nguồn, giống nhau giữa DOM thật và DOMParser", async () => {
  const result = await run(() => {
    const keys = (doc) => [...doc.querySelectorAll("[data-cms-key]")].map((node) => node.dataset.cmsKey);
    const parsed = new DOMParser().parseFromString(document.documentElement.outerHTML, "text/html");
    window.TTCms.stamp(document, "residential");
    window.TTCms.stamp(parsed, "residential");
    return {
      live: keys(document),
      parsed: keys(parsed),
      lists: [...document.querySelectorAll("[data-cms-list]")].map((box) => [box.dataset.cmsList, box.dataset.cmsLabel, box.querySelectorAll("[data-cms-item]").length]),
      mirrorKeys: document.querySelectorAll('[aria-hidden="true"] [data-cms-key]').length,
    };
  });
  assert.deepEqual(result.live, ["title", "description", "t0", "i0", "i1", "i2", "t1", "i3", "t2", "t3"]);
  assert.deepEqual(result.parsed, result.live);
  assert.deepEqual(result.lists, [["l0", "Ảnh hero", 2], ["l1", "Gallery công trình", 2]]);
  assert.equal(result.mirrorKeys, 0);
});

test("apply đổi chữ theo ngôn ngữ, giữ cả hai bản, cập nhật bản sao marquee", async () => {
  const result = await run(() => {
    window.TTCms.stamp(document, "residential");
    window.TTCms.apply(document, {
      text: { t0: { vi: "Mới", en: "New" }, t3: { vi: "Chạy mới", en: "Run" }, title: { vi: "Tiêu đề", en: "Title" } },
    }, "en");
    const node = document.querySelector('[data-cms-key="t0"]');
    return { text: node.textContent, vi: node.dataset.vi, title: document.title, mirror: document.querySelector('.marquee-line[aria-hidden="true"]').textContent };
  });
  assert.deepEqual(result, { text: "New", vi: "Mới", title: "Title", mirror: "Run" });
});

test("apply đổi ảnh: bỏ source và srcset, ghi đúng thuộc tính lazy, alt theo ngôn ngữ", async () => {
  const result = await run(() => {
    window.TTCms.stamp(document, "residential");
    window.TTCms.apply(document, { image: { i1: { src: "/new.webp", width: 800, height: 600, altVi: "Mới", altEn: "New" } } }, "vi");
    const img = document.querySelector('[data-cms-key="i1"]');
    return {
      sources: img.parentElement.querySelectorAll("source").length,
      dataSrc: img.getAttribute("data-src"),
      srcset: img.hasAttribute("srcset"),
      size: [img.getAttribute("width"), img.getAttribute("height")],
      alt: [img.alt, img.dataset.enAlt],
    };
  });
  assert.deepEqual(result, { sources: 0, dataSrc: "/new.webp", srcset: false, size: ["800", "600"], alt: ["Mới", "New"] });
});

test("apply danh sách: sắp lại, mục mới clone với khóa @id và placeholder trống, slide đầu active", async () => {
  const result = await run(() => {
    window.TTCms.stamp(document, "residential");
    window.TTCms.apply(document, {
      list: { l0: ["1", "0"], l1: ["1", "n1", "0"] },
      clone: { n1: "0" },
      text: { "t1@n1": { vi: "Mục mới", en: "New item" } },
    }, "vi");
    const gallery = [...document.querySelectorAll('[data-cms-list="l1"] > figure')].map((item) => ({
      id: item.dataset.cmsItem,
      keys: [...item.querySelectorAll("[data-cms-key]")].map((node) => node.dataset.cmsKey),
      caption: item.querySelector("figcaption").textContent,
      empty: item.querySelector("img").hasAttribute("data-cms-empty"),
    }));
    const slides = [...document.querySelectorAll(".hero-slide")].map((slide) => [slide.dataset.cmsItem, slide.classList.contains("is-active")]);
    return { gallery, slides, placeholder: document.querySelector('[data-cms-key="i2@n1"]').src === window.TTCms.PLACEHOLDER };
  });
  assert.deepEqual(result.slides, [["1", true], ["0", false]]);
  assert.deepEqual(result.gallery, [
    { id: "1", keys: ["i3", "t2"], caption: "Hai", empty: false },
    { id: "n1", keys: ["i2@n1", "t1@n1"], caption: "Mục mới", empty: true },
    { id: "0", keys: ["i2", "t1"], caption: "Một", empty: false },
  ]);
  assert.ok(result.placeholder);
});

// Worker áp nội dung đã lưu trên DOM linkedom (R10): khóa phải trùng khóa editor đọc bằng DOMParser trên trang thật.
const BUILT = [["home", "index.html"], ["residential", "residential/index.html"], ["commercial", "commercial/index.html"], ["about", "about/index.html"]];
test("linkedom gắn khóa y như DOMParser trên bốn trang đã build", { skip: !existsSync(".site-output/index.html") && "chưa build site" }, async () => {
  const { parseHTML } = await import("linkedom");
  await import("../../src/admin/cms-core.js");
  const signature = (doc) => [...doc.querySelectorAll("[data-cms-key], [data-cms-list], [data-cms-item]")]
    .map((node) => `${node.tagName}:${node.dataset.cmsKey ?? ""}:${node.dataset.cmsList ?? ""}:${node.dataset.cmsItem ?? ""}`);
  for (const [id, file] of BUILT) {
    const html = readFileSync(path.join(".site-output", file), "utf8");
    const { document } = parseHTML(html);
    globalThis.TTCms.stamp(document, id);
    const browserSide = await run(([source, page]) => {
      const doc = new DOMParser().parseFromString(source, "text/html");
      window.TTCms.stamp(doc, page);
      return [...doc.querySelectorAll("[data-cms-key], [data-cms-list], [data-cms-item]")]
        .map((node) => `${node.tagName}:${node.dataset.cmsKey ?? ""}:${node.dataset.cmsList ?? ""}:${node.dataset.cmsItem ?? ""}`);
    }, [html, id]);
    assert.deepEqual(signature(document), browserSide, id);
  }
});
