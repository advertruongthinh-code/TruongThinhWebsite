import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const routes = [
  ["home", "src/site/index.html"],
  ["residential", "src/site/residential/index.html"],
  ["commercial", "src/site/commercial/index.html"],
  ["advertising", "src/site/advertising-products/index.html"],
  ["about", "src/site/about/index.html"],
];

const sources = routes.map(([name, file]) => ({
  name,
  file,
  source: fs.readFileSync(path.resolve(file), "utf8"),
}));

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;
}

function element(source, className) {
  return source.match(new RegExp(`<a\\b(?=[^>]*\\bclass="${className}")[^>]*>[\\s\\S]*?<\\/a>`))?.[0] ?? null;
}

for (const { name, file, source } of sources) {
  test(`${name}: shared menu CTA keeps the accepted copy, link, and DOM order`, () => {
    const appointments = [...source.matchAll(/<a\b(?=[^>]*\bclass="menu-appointment")[^>]*>[\s\S]*?<\/a>/g)];
    assert.equal(appointments.length, 1, `${file}: expected one .menu-appointment`);

    const appointment = appointments[0][0];
    const label = appointment.match(/<span\b([^>]*)>([\s\S]*?)<\/span>/);
    assert(label, `${file}: menu CTA label is missing`);
    assert.equal(label[2].trim(), "Gọi Zalo tư vấn", `${file}: Vietnamese menu CTA copy`);
    assert.equal(attribute(label[0], "data-en"), "Talk to us on Zalo", `${file}: English menu CTA copy`);

    const floating = element(source, "floating-cta");
    assert(floating, `${file}: existing floating Zalo CTA is missing`);
    assert.equal(attribute(appointment, "href"), attribute(floating, "href"),
      `${file}: menu CTA must reuse the existing route Zalo href`);

    const closeIndex = source.indexOf("data-menu-close", appointments[0].index + appointment.length);
    assert(closeIndex > appointments[0].index, `${file}: menu CTA must precede close in DOM`);
    assert.match(source.slice(appointments[0].index + appointment.length, closeIndex), /^\s*<button\b[\s\S]*$/,
      `${file}: menu CTA and close must be adjacent siblings`);
  });
}

test("all source routes share one menu Zalo href", () => {
  const hrefs = sources.map(({ source }) => attribute(element(source, "menu-appointment"), "href"));
  assert.equal(new Set(hrefs).size, 1, `menu hrefs differ: ${JSON.stringify(hrefs)}`);
  assert.equal(hrefs[0], "https://zalo.me/", "P7 must preserve the existing Zalo href");
});

test("Advertising does not add a route-specific menu CTA hide", () => {
  const css = fs.readFileSync(path.resolve("src/site/detail.css"), "utf8");
  const routeSpecificHide = /body\.is-advertising-(?:browse|photo)[^{]*\.menu-appointment\s*\{[^}]*display\s*:\s*none/i;
  assert.equal(routeSpecificHide.test(css), false,
    "Advertising browse/photo must keep the shared menu CTA visibility contract");
});
