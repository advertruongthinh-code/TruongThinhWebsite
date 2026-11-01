#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const { webcrypto } = require("node:crypto");

globalThis.crypto ||= webcrypto;

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const ROUTES = ["", "residential", "commercial", "advertising-products", "about"];

const assert = require("node:assert");

function base64url(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
  return Buffer.from(bytes).toString("base64url");
}

async function importWorker() {
  const source = fs.readFileSync("src/worker/index.js", "utf8") + "\nexport { LocaleLink };";
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

async function signedToken(key, header, payload) {
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
}

async function accessToken(key, email, overrides = {}) {
  const header = base64url(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: "https://team.cloudflareaccess.com",
    aud: ["test-audience"],
    exp: Math.floor(Date.now() / 1000) + 300,
    email,
    ...overrides,
  }));
  return signedToken(key, header, payload);
}

function nonCanonicalBase64url(value) {
  const remainder = value.length % 4;
  if (remainder !== 2 && remainder !== 3) {
    throw new Error("Token part has no unused base64url bits to mutate");
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const lastIndex = alphabet.indexOf(value.at(-1));
  const unusedMask = remainder === 2 ? 0b11 : 0b1111;
  const replacement = (lastIndex & ~unusedMask) | ((lastIndex + 1) & unusedMask);
  return `${value.slice(0, -1)}${alphabet[replacement]}`;
}

function zeroPayloadVp8xWebp() {
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x1e, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x58, 0x00, 0x00, 0x00, 0x00,
    0x56, 0x50, 0x38, 0x20, 0x0a, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00,
    0x01, 0x00,
  ]);
}

async function runSecurityContract() {
  const worker = await importWorker();
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  Object.assign(jwk, { kid: "test-key", alg: "RS256", use: "sig" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert(String(url) === "https://team.cloudflareaccess.com/cdn-cgi/access/certs", "Worker fetched an unexpected JWK URL");
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } });
  };
  const env = {
    ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
    ACCESS_AUD: "test-audience",
    ADMIN_EMAILS: "admin@example.test",
    PUBLIC_ORIGIN: "https://site.example",
  };
  try {
    const shell = { fetch: async () => new Response("<!doctype html><html><head></head><body></body></html>") };
    const missingPage = await worker.default.fetch(new Request("https://site.example/vi/"), {
      PUBLIC_ORIGIN: "https://site.example",
      ASSETS: shell,
      DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
    });
    assert(missingPage.status === 404, `missing published page returned ${missingPage.status}`);
    // Runtime SSR được runPublicContract bao phủ trên Wrangler, vốn cung cấp HTMLRewriter.

    const token = await accessToken(pair.privateKey, "admin@example.test");
    const headers = {
      "Cf-Access-Jwt-Assertion": token,
      "Cf-Access-Authenticated-User-Email": "admin@example.test",
      Origin: "https://site.example",
    };
    const protectedEndpoints = [
      ["GET", "/api/admin/pages"],
      ["GET", "/api/admin/projects"],
      ["GET", "/api/admin/products"],
      ["GET", "/api/admin/project-categories"],
      ["GET", "/api/admin/product-categories"],
      ["GET", "/api/admin/settings"],
      ["GET", "/api/admin/media"],
      ["POST", "/api/admin/media"],
      ["PUT", "/api/admin/media/test-media"],
      ["GET", "/api/admin/audit-log"],
      ["PUT", "/api/admin/content/home"],
    ];
    const tokenParts = token.split(".");
    const signatureIndex = Math.floor(tokenParts[2].length / 2);
    const forgedSignature = `${tokenParts[2].slice(0, signatureIndex)}${
      tokenParts[2][signatureIndex] === "a" ? "b" : "a"
    }${tokenParts[2].slice(signatureIndex + 1)}`;
    const forged = `${tokenParts[0]}.${tokenParts[1]}.${forgedSignature}`;
    const nonCanonicalIndex = tokenParts.findIndex((part) => {
      const remainder = part.length % 4;
      return remainder === 2 || remainder === 3;
    });
    assert(nonCanonicalIndex >= 0, "test JWT has no non-canonical base64url variant");
    const nonCanonicalParts = [...tokenParts];
    nonCanonicalParts[nonCanonicalIndex] = nonCanonicalBase64url(
      nonCanonicalParts[nonCanonicalIndex],
    );
    const nonCanonical = await signedToken(
      pair.privateKey,
      nonCanonicalParts[0],
      nonCanonicalParts[1],
    );
    const padded = await signedToken(pair.privateKey, `${tokenParts[0]}=`, tokenParts[1]);
    const rejectedTokens = [
      ["missing", null, "admin@example.test"],
      ["forged", forged, "admin@example.test"],
      ["re-signed padded base64url", padded, "admin@example.test"],
      ["re-signed non-canonical base64url", nonCanonical, "admin@example.test"],
      ["expired", await accessToken(pair.privateKey, "admin@example.test", { exp: Math.floor(Date.now() / 1000) - 1 }), "admin@example.test"],
      ["wrong issuer", await accessToken(pair.privateKey, "admin@example.test", { iss: "https://other.cloudflareaccess.com" }), "admin@example.test"],
      ["wrong audience", await accessToken(pair.privateKey, "admin@example.test", { aud: ["other-audience"] }), "admin@example.test"],
      ["wrong email", await accessToken(pair.privateKey, "other@example.test"), "other@example.test"],
      ["email header mismatch", token, "other@example.test"],
    ];
    for (const [label, rejectedToken, assertedEmail] of rejectedTokens) {
      for (const [method, path] of protectedEndpoints) {
        const response = await worker.default.fetch(new Request(`https://site.example${path}`, {
          method,
          headers: {
            ...(rejectedToken ? { "Cf-Access-Jwt-Assertion": rejectedToken } : {}),
            "Cf-Access-Authenticated-User-Email": assertedEmail,
            Origin: "https://site.example",
          },
        }), env);
        assert(response.status === 403, `${label} token reached ${method} ${path} with ${response.status}`);
      }
    }

    // Đăng nhập dev chỉ nhận host loopback; host public vẫn cần Access dù biến bị đặt nhầm.
    const devEnv = { ...env, CMS_LOCAL_ADMIN_EMAIL: "admin@localhost" };
    for (const [method, path] of protectedEndpoints) {
      const response = await worker.default.fetch(new Request(`https://site.example${path}`, { method, headers: { Origin: "https://site.example" } }), devEnv);
      assert(response.status === 403, `dev admin reached public host ${method} ${path} with ${response.status}`);
    }
    const devList = await worker.default.fetch(new Request("http://127.0.0.1:8788/api/admin/settings"), {
      ...devEnv,
      DB: { prepare: () => ({ all: async () => ({ results: [] }) }) },
    });
    assert.equal(devList.status, 200, "dev admin must reach admin API on loopback");

    const invalidWebp = new FormData();
    invalidWebp.append("kind", "image");
    invalidWebp.append("file", new Blob(["not a WebP"], { type: "image/webp" }), "invalid.webp");
    const invalidUpload = await worker.default.fetch(new Request("https://site.example/api/admin/media", { method: "POST", headers, body: invalidWebp }), env);
    assert(invalidUpload.status === 400, `invalid WebP fixture returned ${invalidUpload.status}`);

    const zeroPayloadVp8x = new FormData();
    zeroPayloadVp8x.append("kind", "image");
    zeroPayloadVp8x.append(
      "file",
      new Blob([zeroPayloadVp8xWebp()], { type: "image/webp" }),
      "zero-vp8x.webp",
    );
    const invalidVp8x = await worker.default.fetch(new Request("https://site.example/api/admin/media", { method: "POST", headers, body: zeroPayloadVp8x }), env);
    assert(invalidVp8x.status === 400, `zero-payload VP8X fixture returned ${invalidVp8x.status}`);

    const unsafeSvg = new FormData();
    unsafeSvg.append("kind", "logo");
    unsafeSvg.append("file", new Blob(["<svg><script>alert(1)</script></svg>"], { type: "image/svg+xml" }), "unsafe.svg");
    const invalidSvg = await worker.default.fetch(new Request("https://site.example/api/admin/media", { method: "POST", headers, body: unsafeSvg }), env);
    assert(invalidSvg.status === 400, `unsafe SVG fixture returned ${invalidSvg.status}`);

    for (const svg of ["<svg/onload=alert(1)></svg>", '<svg><path/ONCLICK="alert(1)" /></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><path onload="alert(1)" /></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"onload="alert(1)"></svg>',
      '<svg xmlns="https://attacker.test/svg"></svg>']) {
      const form = new FormData();
      form.append("kind", "logo");
      form.append("file", new Blob([svg], { type: "image/svg+xml" }), "event.svg");
      const result = await worker.default.fetch(new Request("https://site.example/api/admin/media", { method: "POST", headers, body: form }), env);
      assert.equal(result.status, 400, "SVG event handlers must be rejected before storage");
    }

    const logo = '<svg viewBox="0 0 10 10"><path fill="#123456" d="M0 0h10v10H0z" /></svg>';
    for (const method of ["GET", "HEAD"]) {
      const media = await worker.default.fetch(new Request("https://site.example/media/logo", { method }), {
        DB: { prepare: () => ({ bind: () => ({ first: async () => ({ object_key: "logo.svg", content_type: "image/svg+xml" }) }) }) },
        MEDIA: { get: async () => ({ body: logo, httpEtag: '"logo"' }) },
      });
      assert.equal(media.status, 200);
      assert.equal(media.headers.get("content-security-policy"), "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      assert.equal(media.headers.get("x-content-type-options"), "nosniff");
      assert.equal(await media.text(), method === "HEAD" ? "" : logo);
    }

    for (const locale of ["vi", "en"]) {
      for (const href of ["/media/x", "/admin/", "/api/x", "/robots.txt", "/sitemap.xml?x=1", "/media#x", "//external.test/x", "/residential/"]) {
        const attributes = new Map([["href", href]]);
        new worker.LocaleLink(locale).element({
          hasAttribute: (name) => attributes.has(name),
          getAttribute: (name) => attributes.get(name),
          setAttribute: (name, value) => attributes.set(name, value),
        });
        assert.equal(attributes.get("href"), href === "/residential/" ? `/${locale}${href}` : href);
      }
    }

    const uploaded = [];
    const validUploadEnv = {
      ...env,
      MEDIA: { put: async (key, bytes, options) => uploaded.push({ key, bytes, options }) },
      DB: { prepare: () => ({ bind: () => ({ run: async () => ({ success: true }) }) }) },
    };
    const validWebp = new FormData();
    validWebp.append("kind", "image");
    validWebp.append("alt_vi", "Ảnh kiểm thử");
    validWebp.append("alt_en", "Test image");
    validWebp.append(
      "file",
      new Blob([fs.readFileSync("src/site/assets/content/projects/commercial-space.webp")], { type: "image/webp" }),
      "known-good.webp",
    );
    const acceptedUpload = await worker.default.fetch(new Request("https://site.example/api/admin/media", { method: "POST", headers, body: validWebp }), validUploadEnv);
    assert(acceptedUpload.status === 201 && uploaded.length === 1, `known-good WebP fixture returned ${acceptedUpload.status}`);

    const validLogo = new FormData();
    validLogo.append("kind", "logo");
    validLogo.append("file", new Blob([fs.readFileSync("src/site/assets/brand/truong-thinh-lockup.svg")], { type: "image/svg+xml" }), "logo.svg");
    const acceptedLogo = await worker.default.fetch(new Request("https://site.example/api/admin/media", { method: "POST", headers, body: validLogo }), validUploadEnv);
    assert.equal(acceptedLogo.status, 201, "vector logos must remain uploadable");

    const csrf = await worker.default.fetch(new Request("https://site.example/api/admin/media", { method: "POST", headers: { ...headers, Origin: "https://attacker.example" }, body: invalidWebp }), env);
    assert(csrf.status === 403, `cross-origin admin write returned ${csrf.status}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function response(path, options) {
  return fetch(`${BASE_URL}${path}`, { redirect: "manual", ...options });
}

async function runPublicContract() {
  for (const locale of ["vi", "en"]) {
    for (const segment of ROUTES) {
      const path = `/${locale}/${segment ? `${segment}/` : ""}`;
      const result = await response(path);
      const body = await result.text();
      assert(result.status === 200, `${path} returned ${result.status}`);
      assert(result.headers.get("content-language") === locale, `${path} has wrong Content-Language`);
      assert(body.includes(`<html lang="${locale}" data-route-locale="${locale}">`), `${path} is not SSR-localized`);
      assert(body.includes(`hreflang="x-default" href="${BASE_URL}/vi/${segment ? `${segment}/` : ""}"`), `${path} is missing x-default hreflang`);
      assert(/<title\b[^>]*>[^<]+<\/title>/.test(body), `${path} has no SSR title`);
      if (segment === "commercial") {
        const expectedTitle = locale === "vi" ? "Không gian Kinh doanh — Trường Thịnh" : "Commercial spaces — Trường Thịnh";
        assert(new RegExp(`<title\\b(?=[^>]*data-en="Commercial spaces — Trường Thịnh")[^>]*>\\s*${expectedTitle}\\s*</title>`).test(body), `${path} did not preserve the SSR commercial title`);
        const expectedKicker = locale === "vi"
          ? "SHOP · F&amp;B · CAFE · VĂN PHÒNG"
          : "RETAIL · F&amp;B · CAFÉS · OFFICES";
        assert(new RegExp(`>\\s*${expectedKicker}\\s*</p>`).test(body), `${path} did not preserve the SSR commercial hero kicker`);
      }
      if (segment === "advertising-products") {
        const expectedTitle = locale === "vi" ? "Sản phẩm Quảng cáo — Trường Thịnh" : "Advertising products — Trường Thịnh";
        const expectedQualifier = locale === "vi" ? "Sản phẩm" : "Advertising";
        const expectedHeroTitle = locale === "vi" ? "Quảng cáo" : "products";
        assert(new RegExp(`<title\\b(?=[^>]*data-en="Advertising products — Trường Thịnh")[^>]*>\\s*${expectedTitle}\\s*</title>`).test(body), `${path} did not preserve the SSR projects/products title`);
        assert(new RegExp(`data-cms="hero\\.qualifier"[^>]*>\\s*${expectedQualifier}\\s*</span>`).test(body), `${path} did not preserve the SSR projects/products qualifier`);
        assert(new RegExp(`data-cms="hero\\.title"[^>]*>\\s*${expectedHeroTitle}\\s*</span>`).test(body), `${path} did not preserve the SSR projects/products hero title`);
      }
      const counterpart = locale === "vi" ? "en" : "vi";
      assert(body.includes(`hreflang="${counterpart}" href="${BASE_URL}/${counterpart}/${segment ? `${segment}/` : ""}"`), `${path} does not contain a localized counterpart URL`);
      assert(
        body.includes(`href="/${locale}/${segment ? `${segment}/` : ""}" data-language-option="${locale}"`) &&
          body.includes(`href="/${counterpart}/${segment ? `${segment}/` : ""}" data-language-option="${counterpart}"`),
        `${path} language links are not reciprocal in the SSR shell`,
      );
    }
  }

  for (const [source, destination] of [
    ["/?keep=1", "/vi/?keep=1"],
    ["/nha-o/index.html?keep=1", "/vi/residential/?keep=1"],
    ["/kinh-doanh/?keep=1", "/vi/commercial/?keep=1"],
    ["/quang-cao/?keep=1", "/vi/advertising-products/?keep=1"],
    ["/vi/projects-products/?keep=1", "/vi/advertising-products/?keep=1"],
    ["/en/projects-products/?keep=1", "/en/advertising-products/?keep=1"],
    ["/gioi-thieu/?keep=1", "/vi/about/?keep=1"],
    ["/residential/?keep=1", "/vi/residential/?keep=1"],
  ]) {
    const result = await response(source);
    assert(result.status === 308, `${source} returned ${result.status}, expected 308`);
    assert(new URL(result.headers.get("location")).pathname + new URL(result.headers.get("location")).search === destination, `${source} redirected to ${result.headers.get("location")}`);
  }

  const robots = await response("/robots.txt");
  const robotsText = await robots.text();
  assert(robots.status === 200 && robotsText.includes("Disallow: /admin/") && robotsText.includes(`${BASE_URL}/sitemap.xml`), "robots.txt contract failed");
  const sitemap = await response("/sitemap.xml");
  const sitemapText = await sitemap.text();
  assert(sitemap.status === 200 && sitemapText.includes(`${BASE_URL}/vi/`) && sitemapText.includes(`${BASE_URL}/en/about/`), "sitemap contract failed");
  const admin = await response("/api/admin/pages");
  assert(admin.status === 403, `unauthenticated deployed admin read returned ${admin.status}`);
  const projects = await response("/api/public/projects");
  const projectCatalog = await projects.json();
  assert(
    projects.status === 200 && Array.isArray(projectCatalog.categories) && Array.isArray(projectCatalog.items),
    "public project catalog must return categories and items arrays",
  );
  assert(
    JSON.stringify(projectCatalog.categories.map((category) => [category.id, category.position, category.label_vi])) === JSON.stringify([
      ["residential", 101, "Nhà ở"],
      ["commercial", 102, "Kinh doanh"],
      ["kiosk-posm-project", 103, "Kiosk & POSM"],
      ["mobile-retail", 104, "Xe bán hàng"],
      ["signage-project", 105, "Bảng hiệu"],
      ["light-boxes", 106, "Hộp đèn"],
    ]),
    "public project categories do not match the canonical ordered labels",
  );
  const menuFixtureWorker = await importWorker();
  const menuFixtureDb = {
    prepare(sql) {
      return {
        all: async () => sql.includes("FROM project_categories")
          ? { results: [] }
          : {
              results: [
                {
                  slug: "valid-menu-project",
                  menu_group: "residential",
                  menu_order: 1,
                  content_json: JSON.stringify({ vi: { name: "Nhà phố" }, en: { name: "Townhouse" } }),
                },
                {
                  slug: "valid-menu-project-z",
                  menu_group: "residential",
                  menu_order: 1,
                  content_json: JSON.stringify({ vi: { name: "Nhà phố Z" }, en: { name: "Townhouse Z" } }),
                },
                {
                  slug: "invalid-menu-group",
                  menu_group: "not-a-menu-group",
                  menu_order: 2,
                  content_json: JSON.stringify({ vi: { name: "Bỏ qua" }, en: { name: "Skip" } }),
                },
                {
                  slug: "null-menu-group",
                  menu_group: null,
                  menu_order: 3,
                  content_json: JSON.stringify({ vi: { name: "Bỏ qua" }, en: { name: "Skip" } }),
                },
                {
                  slug: "vi-only-menu-project",
                  menu_group: "commercial",
                  menu_order: 4,
                  content_json: JSON.stringify({ vi: { name: "Chỉ tiếng Việt" }, en: { name: "" } }),
                },
              ],
            },
      };
    },
  };
  const menuFixtureResponse = await menuFixtureWorker.default.fetch(
    new Request("https://site.example/api/public/projects"),
    { DB: menuFixtureDb },
  );
  const menuFixture = await menuFixtureResponse.json();
  assert(
    menuFixtureResponse.status === 200 &&
      JSON.stringify(menuFixture.items) === JSON.stringify([
        { slug: "valid-menu-project", menu_group: "residential", menu_order: 1, name: { vi: "Nhà phố", en: "Townhouse" } },
        { slug: "valid-menu-project-z", menu_group: "residential", menu_order: 1, name: { vi: "Nhà phố Z", en: "Townhouse Z" } },
      ]),
    "public project menu feed did not whitelist groups or reject incomplete localized names",
  );
  const products = await response("/api/public/products");
  const catalog = await products.json();
  assert(products.status === 200 && catalog.items.length === 36, "public catalog does not include all 36 seeded products");
  assert(
    JSON.stringify(catalog.categories.map((category) => [category.id, category.label_vi])) === JSON.stringify([
      ["kiosk-posm", "Kiosk, xe bán hàng & POSM"],
      ["signage-3d", "Biển hiệu & chữ nổi 3D"],
      ["office-wayfinding", "Biển tên & chỉ dẫn"],
      ["led-lighting", "LED & hộp đèn"],
      ["print-marketing", "In ấn & decal"],
      ["brand-showroom", "Nhận diện thương hiệu & showroom"],
    ]),
    "catalog categories do not match the canonical ordered labels",
  );
}

(async () => {
  const securityOnly = process.argv.includes("--security-only");
  await runSecurityContract();
  if (!securityOnly) await runPublicContract();
  console.log(
    securityOnly
      ? "[worker-contract] security fixtures passed"
      : "[worker-contract] security, redirects, raw SSR, robots, sitemap, and CMS catalog passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
