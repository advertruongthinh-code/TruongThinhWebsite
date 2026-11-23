// Contact links and CTA buttons from contact.json (cms-plan part 2 K8, task E7): node --test tests/site/contact-menu.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { renderBlocks } from "../../scripts/site/blocks.mjs";
import { CTA_KEYS, fillContact } from "../../scripts/site/slots.mjs";
import { SHELL_PAGES } from "../../scripts/site/shell.mjs";
import { fullErrors, shapeErrors } from "../../src/cms/contract.mjs";

const root = path.resolve(new URL("../../", import.meta.url).pathname);
const contact = JSON.parse(readFileSync(path.join(root, "src/site/content/contact.json"), "utf8"));
const walk = (dir, skip = []) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  if (skip.includes(path.relative(root, file))) return [];
  return entry.isDirectory() ? walk(file, skip) : [file];
});
const copy = (changes) => ({ ...structuredClone(contact), ...changes });

test("no Zalo or phone link is written by hand in src/site or scripts/site", () => {
  const files = [...walk(path.join(root, "src/site"), ["src/site/content", "src/site/assets"]), ...walk(path.join(root, "scripts/site"))];
  const hits = files.filter((file) => /\.(html|mjs|js)$/.test(file)).filter((file) => /zalo\.me|tel:\+84/.test(readFileSync(file, "utf8")));
  assert.deepEqual(hits.map((file) => path.relative(root, file)), []);
});

test("CTA_KEYS are exactly the data-cta keys of the pages, partials, floating CTA rows and contact-quick", () => {
  const html = walk(path.join(root, "src/site"), ["src/site/content", "src/site/assets"]).filter((file) => file.endsWith(".html"));
  const keys = new Set(html.flatMap((file) => [...readFileSync(file, "utf8").matchAll(/data-cta="([a-z0-9-]+)"/g)].map((match) => match[1])));
  for (const row of Object.values(SHELL_PAGES)) keys.add(row.ctaKey);
  keys.add("contact-quick");
  assert.deepEqual([...keys].toSorted(), [...CTA_KEYS].toSorted());
  assert.deepEqual(Object.keys(contact.cta).toSorted(), [...CTA_KEYS].toSorted());
});

test("fillContact writes href, label span and aria; leaves aria of a labelled button without cta.aria", () => {
  const html = '<a href="#" data-cta="floating" aria-label="Riêng trang" data-en-aria-label="Own page"><span data-en="">x</span></a><a href="#" data-cta="menu"></a>';
  const out = fillContact(html, copy({ cta: { ...contact.cta, floating: { vi: "Gọi & hỏi", en: "Call", channel: "hotline" } } }));
  assert.equal(out, '<a href="tel:+84949131050" data-cta="floating" aria-label="Riêng trang" data-en-aria-label="Own page"><span data-en="Call">Gọi &amp; hỏi</span></a>'
    + '<a data-en-aria-label="Talk to us on Zalo" aria-label="Gọi Zalo tư vấn" href="https://zalo.me/0949131050" data-cta="menu"></a>');
  const withAria = fillContact(html, copy({ cta: { ...contact.cta, floating: { vi: "A", en: "B", aria: { vi: "C", en: "D" }, channel: "zalo" } } }));
  assert.match(withAria, /aria-label="C" data-en-aria-label="D"><span data-en="B">A<\/span>/);
  const follows = fillContact('<a href="#" data-cta="advertising-2" aria-label="" data-en-aria-label=""><span data-en="">x</span></a>',
    copy({ cta: { ...contact.cta, "advertising-2": { vi: "Nhắn ý tưởng mới", en: "New idea", channel: "zalo" } } }));
  assert.match(follows, /aria-label="Nhắn ý tưởng mới" data-en-aria-label="New idea"><span data-en="New idea">Nhắn ý tưởng mới<\/span>/, "an empty aria-label follows the text");
});

test("a channel's text goes in its strong or in the link; an empty channel renders the disabled form and a filled one enables it", () => {
  const html = '<a class="f" href="#" data-channel="hotline" draggable="false"><svg></svg><span>Hotline</span> <strong>0</strong></a><a href="#" data-channel="office">0</a>'
    + '<a class="s" data-channel="facebook" role="link" aria-disabled="true" tabindex="-1" aria-label="Facebook">F</a>';
  const out = fillContact(html, contact);
  assert.match(out, /<a class="f" href="tel:\+84949131050" data-channel="hotline" draggable="false"><svg><\/svg><span>Hotline<\/span> <strong>\+84 949 131 050<\/strong><\/a>/);
  assert.match(out, /<a href="tel:\+842753813753" data-channel="office">\+84 275 381 3753<\/a>/);
  assert.match(out, /<a class="s" data-channel="facebook" role="link" aria-disabled="true" tabindex="-1" aria-label="Facebook">F<\/a>/, "an empty channel keeps the disabled link as is");
  const live = fillContact(html, copy({ channels: { ...contact.channels, facebook: { href: "https://facebook.com/tt" }, hotline: { href: "", text: "+84 1" } } }));
  assert.match(live, /<a target="_blank" rel="noreferrer" href="https:\/\/facebook.com\/tt" class="s" data-channel="facebook" aria-label="Facebook">F<\/a>/);
  assert.match(live, /<a role="link" aria-disabled="true" tabindex="-1" class="f" data-channel="hotline" draggable="false">/);
});

test("fillContact stops on an unknown cta key and on a link left as #", () => {
  assert.throws(() => fillContact('<a href="#" data-cta="nope"></a>', contact), /no cta "nope"/);
  assert.throws(() => fillContact('<a href="#" data-cta="menu"></a>', copy({ channels: { ...contact.channels, zalo: undefined } })), /no channel "zalo"/);
  assert.throws(() => fillContact('<script>const x = \'<a href="#" data-cta="menu">\';</script>', contact), /href="#"/);
});

test("the contact-quick block reads its button from ctx.contact, disabled when the channel is empty", () => {
  const page = { blocks: [{ id: "c", type: "contact-quick", title: { vi: "Tư vấn", en: "Talk" } }] };
  assert.match(renderBlocks(page, { contact }), /<a class="blk-contact__zalo" href="https:\/\/zalo.me\/0949131050" target="_blank" rel="noopener" data-en="Chat on Zalo">Nhắn Zalo<\/a>/);
  const off = copy({ channels: { ...contact.channels, zalo: { href: "" } }, cta: { ...contact.cta, "contact-quick": { vi: "Gọi", en: "Call", channel: "zalo" } } });
  assert.match(renderBlocks(page, { contact: off }), /<a class="blk-contact__zalo" role="link" aria-disabled="true" tabindex="-1" data-en="Call">Gọi<\/a>/);
});

test("contact contract: six channels, fixed cta keys, safe href; a button on an empty channel is missing", async () => {
  assert.deepEqual(await shapeErrors("contact", contact), []);
  assert.deepEqual(await fullErrors("contact", contact), []);
  const codes = async (data) => (await shapeErrors("contact", data)).map(({ code }) => code);
  assert.deepEqual(await codes(copy({ channels: { ...contact.channels, email: { href: "" } } })), ["contact-channels"]);
  assert.deepEqual(await codes(copy({ channels: { ...contact.channels, zalo: { href: "javascript:alert(1)" } } })), ["contact-href"]);
  assert.deepEqual(await codes(copy({ cta: { ...contact.cta, extra: { vi: "a", en: "b", channel: "zalo" } } })), ["contact-cta"]);
  assert.deepEqual(await codes(copy({ cta: { ...contact.cta, menu: { vi: "a", en: "b", channel: "fax" } } })), ["contact-channel"]);
  for (const aria of [{ vi: "a" }, { en: "b" }, "a"]) assert.equal((await shapeErrors("contact", copy({ cta: { ...contact.cta, menu: { vi: "a", en: "b", channel: "zalo", aria } } }))).length, 1, JSON.stringify(aria));
  const empty = copy({ channels: { ...contact.channels, zalo: { href: "" } } });
  assert.deepEqual(await codes(empty), []);
  assert.ok((await fullErrors("contact", empty)).every(({ level }) => level === "missing"));
  assert.equal((await fullErrors("contact", empty)).length, Object.values(contact.cta).filter(({ channel }) => channel === "zalo").length);
});

test("the build points every data-cta button to the Zalo link of contact.json in the content dir", { timeout: 300_000 }, (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "contact-"));
  const out = mkdtempSync(path.join(root, ".site-output-r2-"));
  t.after(() => { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); });
  cpSync(path.join(root, "src/site/content"), dir, { recursive: true });
  const zalo = "https://zalo.me/0900000000";
  writeFileSync(path.join(dir, "contact.json"), JSON.stringify(copy({ channels: { ...contact.channels, zalo: { href: zalo }, hotline: { href: "tel:+84900000001", text: "+84 900 000 001" } } })));
  const result = spawnSync(process.execPath, ["scripts/site/prepare-static-assets.mjs"], { cwd: root, env: { ...process.env, TT_CONTENT_DIR: dir, TT_SITE_OUT: out }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  for (const page of ["index.html", "en/index.html", "residential/index.html", "about/index.html", "advertising-products/index.html", "404.html"]) {
    const html = readFileSync(path.join(out, page), "utf8");
    const buttons = [...html.matchAll(/<a\b[^>]*data-cta="[^"]+"[^>]*>/g)].map(([tag]) => tag);
    assert.ok(buttons.length >= 2, page);
    assert.deepEqual(buttons.filter((tag) => !tag.includes(`href="${zalo}"`)), [], page);
    assert.ok(!html.includes("zalo.me/0949131050") && !html.includes("tel:+84949131050"), page);
    assert.match(html, /<strong>\+84 900 000 001<\/strong>/, page);
  }
});
