import assert from "node:assert/strict";

globalThis.HTMLRewriter = class {
  on() {
    return this;
  }

  transform(response) {
    return response;
  }
};

const { default: worker } = await import("../../src/worker/index.js");
const slugs = [
  "kiosk-posm",
  "mobile-retail",
  "signage-raised-letters",
  "office-signs-wayfinding",
  "led-displays-lightboxes",
  "print-decals",
];
const assetRequests = [];
const env = {
  DB: {
    prepare() {
      throw new Error("Advertising detail routes must not query the dormant CMS database");
    },
  },
  ASSETS: {
    fetch(request) {
      assetRequests.push(new URL(request.url).pathname);
      return new Response("<!doctype html><html><head></head><body>detail</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=UTF-8" },
      });
    },
  },
  PUBLIC_ORIGIN: "https://truongthinh.vn",
};

for (const locale of ["vi", "en"]) {
  for (const slug of slugs) {
    const response = await worker.fetch(
      new Request(`https://truongthinh.vn/${locale}/advertising-products/${slug}/`),
      env,
      {},
    );
    assert.equal(response.status, 200, `${locale}/${slug} failed with a DB binding`);
    assert.equal(response.headers.get("content-language"), locale);
  }
}

assert.deepEqual(
  assetRequests,
  ["vi", "en"].flatMap(() => slugs.map((slug) => `/advertising-products/${slug}/index.html`)),
  "each canonical route must read its generated static detail page",
);

console.log("[advertising-detail-route] 12 locale routes bypass dormant DB content and resolve static pages");
