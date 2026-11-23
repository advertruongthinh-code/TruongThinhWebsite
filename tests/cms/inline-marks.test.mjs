// Marked text (cms-plan part 2 K2, cms-content R8, cms-editor R5): node --test tests/cms/inline-marks.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { localeHtml } from "../../scripts/tooling/serve-static-parity.mjs";
import { listHtml, markedInner, marksErrors, parseMarks, plainText, skeleton, typoWarnings } from "../../src/cms/inline-marks.mjs";

const ctx = { news: new Map([["n1", { slugVi: "tin-a", slugEn: "post-a" }]]), projects: new Map(), clusters: [], projectTypes: [] };
const codes = (errors) => errors.map(({ code }) => code);
const seg = (tag, vi, en, attributes = "") => `<${tag}${attributes} data-en="${en}" data-vi="${vi}" data-seg>${vi}</${tag}>`;

test("each mark parses to its token, escapes keep the character", () => {
  assert.deepEqual(parseMarks("a **b** *c* ^2^ [d](page:home)\ne"), [
    { t: "text", s: "a " }, { t: "b", s: "b" }, { t: "text", s: " " }, { t: "i", s: "c" }, { t: "text", s: " " }, { t: "sup", s: "2" },
    { t: "text", s: " " }, { t: "a", s: "d", link: "page:home" }, { t: "br" }, { t: "text", s: "e" },
  ]);
  assert.deepEqual(parseMarks("5\\^ \\*x\\* \\[y] a\\b \\\\"), [{ t: "text", s: "5^ *x* [y] a\\b \\" }]);
  assert.equal(skeleton(parseMarks("a **b** c\nd")), "b,br");
  assert.equal(plainText("a **b** [c](page:home)\nd"), "a b c\nd");
});

test("VI and EN pair segment by segment, every segment is a leaf with data-en, data-vi and data-seg", () => {
  assert.equal(markedInner("Gỗ **sồi**", "**Oak** wood", ctx), `${seg("span", "Gỗ\u00a0", "")}${seg("strong", "sồi", "Oak")}${seg("span", "", "\u00a0wood")}`);
  assert.equal(markedInner("25 m^2^", "25 m^2^", ctx), `${seg("span", "25\u00a0m", "25\u00a0m")}${seg("sup", "2", "2")}`);
  assert.equal(markedInner("dòng một\ndòng hai", "line one\nline two", ctx), `${seg("span", "dòng một", "line one")}<br>${seg("span", "dòng hai", "line two")}`);
  assert.equal(markedInner("Đọc [bài](page:news/n1)", "Read [post](page:news/n1)", ctx),
    `${seg("span", "Đọc\u00a0", "Read\u00a0")}${seg("a", "bài", "post", ' href="/news/tin-a/" data-en-href="/en/news/post-a/"')}`);
  assert.equal(markedInner("Xem [web](https://example.com/?a=1&b=2)", "See [site](https://example.com/?a=1&b=2)", ctx),
    `${seg("span", "Xem\u00a0", "See\u00a0")}${seg("a", "web", "site", ' href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"')}`);
  // Missing target: the link renders as plain text.
  assert.equal(markedInner("Đọc [bài](page:news/gone)", "Read [post](page:news/gone)", ctx), `${seg("span", "Đọc\u00a0", "Read\u00a0")}${seg("span", "bài", "post")}`);
});

test("text without marks or breaks returns null, so callers keep the old path", () => {
  for (const text of ["", "Chữ thường", "Có dấu cách cứng", "a] b) c"]) assert.equal(markedInner(text, "Plain", ctx), null, text);
});

test("the last two words of the whole string are tied, middle segments are not", () => {
  assert.equal(markedInner("Ngôi nhà ấm như *gỗ sồi*", "A home as warm as *oak*", ctx),
    `${seg("span", "Ngôi nhà ấm như ", "A home as warm as ")}${seg("em", "gỗ sồi", "oak")}`);
  assert.equal(markedInner("**Đậm** giữa câu dài", "**Bold** in a long line", ctx),
    `${seg("strong", "Đậm", "Bold")}${seg("span", " giữa câu dài", " in a long line")}`);
  // A separator word stays with the word after it, like tieLastWord.
  assert.equal(markedInner("*a* b · c", "*a* b · c", ctx), `${seg("em", "a", "a")}${seg("span", " b · c", " b · c")}`);
});

test("lists: every line starts with a bullet or a number; ol keeps the first number", () => {
  assert.equal(listHtml("• một\n• **hai**", "• one\n• **two**", ctx),
    `<ul><li>${seg("span", "một", "one")}</li><li>${seg("strong", "hai", "two")}</li></ul>`);
  assert.equal(listHtml("3. ba\n4. bốn", "3. three\n4. four", ctx), `<ol start="3"><li>${seg("span", "ba", "three")}</li><li>${seg("span", "bốn", "four")}</li></ol>`);
  assert.deepEqual(marksErrors("• một\nhai", "• one\ntwo", "body"), [], "mixed lines are a plain paragraph");
  assert.deepEqual(codes(marksErrors("• một\n• hai", "• one", "body")), ["list-mismatch"]);
  assert.deepEqual(codes(marksErrors("• một\n• hai", "1. one\n2. two", "body")), ["list-mismatch"]);
});

test("errors: unclosed, empty, nested, bad link, not allowed, mismatch", () => {
  assert.deepEqual(codes(marksErrors("****", "****", "body")), ["mark-unclosed", "mark-unclosed"]);
  assert.deepEqual(codes(marksErrors("5^", "5\\^", "body")), ["mark-unclosed"]);
  assert.deepEqual(codes(marksErrors("*a\nb*", "x", "body")), ["mark-unclosed", "mark-unclosed"], "a mark cannot span a line break");
  assert.deepEqual(codes(marksErrors("**a *b* c**", "x", "body")), ["mark-nested"]);
  assert.deepEqual(codes(marksErrors("[](page:home)", "x", "body")), ["link"]);
  assert.deepEqual(codes(marksErrors("[a](javascript:alert(1))", "x", "body")), ["link"]);
  assert.deepEqual(codes(marksErrors("[a](http://x.y)", "x", "body")), ["link"]);
  assert.deepEqual(codes(marksErrors("**a**", "**a**", "small")), ["mark-not-allowed", "mark-not-allowed"]);
  assert.deepEqual(codes(marksErrors("a\nb", "a\nb", "small")), ["mark-not-allowed", "mark-not-allowed"]);
  assert.deepEqual(codes(marksErrors("*a*", "*a*", "plain")), ["mark-not-allowed", "mark-not-allowed"]);
  assert.deepEqual(codes(marksErrors("**a** b", "*a* b", "body")), ["marks-mismatch"]);
  assert.deepEqual(codes(marksErrors("a\nb", "a b", "title")), ["marks-mismatch"]);
  assert.deepEqual(marksErrors("**Gỗ** sồi\n\n*Đoạn* hai", "**Oak** wood\n\n*Second* part", "body"), []);
  assert.deepEqual(codes(marksErrors("5\\^ m", "5 m", "plain")), ["mark-not-allowed"], "plain fields render as typed, no escapes");
  assert.deepEqual(marksErrors("5\\^ m", "5\\^ m", "small"), []);
});

test("random strings never produce a tag or attribute outside the allowed set", () => {
  const alphabet = [..."<>&\"'*^[]()\\ \nab"];
  let seed = 42; // mulberry32, fixed seed
  const random = () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 2 ** 32; };
  const tags = new Set(["span", "strong", "em", "sup", "a", "br", "ul", "ol", "li"]);
  const attributes = new Set(["data-en", "data-vi", "data-seg", "href", "data-en-href", "target", "rel", "start"]);
  let rendered = 0;
  for (let index = 0; index < 200; index += 1) {
    const text = Array.from({ length: 1 + Math.floor(random() * 24) }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
    for (const candidate of [text, `**${text}**`, `[${text}](page:home)`]) {
      if (marksErrors(candidate, candidate, "body").length) continue;
      const html = markedInner(candidate, candidate, { ...ctx, projectTypes: [] }) ?? "";
      rendered += 1;
      // Remove every allowed tag with only allowed attributes; any < or > left over is raw HTML that got through.
      const rest = html.replace(/<\/?([a-z]+)((?:\s[a-z-]+(?:="[^"<>]*")?)*)>/g, (tag, name, list) => {
        assert.ok(tags.has(name), `${JSON.stringify(candidate)} -> <${name}>`);
        for (const [, attribute] of list.matchAll(/\s([a-z-]+)(?:="[^"]*")?/g)) assert.ok(attributes.has(attribute), `${JSON.stringify(candidate)} -> ${attribute}`);
        return "";
      });
      assert.ok(!/[<>]/.test(rest), `${JSON.stringify(candidate)} leaves raw HTML: ${rest}`);
    }
  }
  assert.ok(rendered >= 100, `only ${rendered} random strings rendered`);
});

test("typo warnings: a broken line ends with punctuation, a lone word after a break", () => {
  assert.deepEqual(typoWarnings("Dòng một,\nhai ba").map(({ code }) => code), ["line-end-punct"]);
  assert.deepEqual(typoWarnings("Dòng một\nhai").map(({ code }) => code), ["lone-word"]);
  assert.deepEqual(typoWarnings("Câu một. Câu hai."), []);
});

test("the EN page swaps every segment even when the text contains data-en=", () => {
  const html = `<p>${markedInner("x data-en=\nabc", "y data-en=\ndef", ctx)}</p>`;
  assert.equal(localeHtml(html, "en"), '<p><span data-en="y data-en=" data-vi="x data-en=" data-seg>y data-en=</span><br><span data-en="def" data-vi="abc" data-seg>def</span></p>');
});

test("render never throws on EN that has not been validated, plainText never throws", () => {
  assert.equal(markedInner("a **b**", "", ctx), `${seg("span", "a\u00a0", "")}${seg("strong", "b", "")}`);
  assert.equal(listHtml("• một\n• hai", "", ctx), `<ul><li>${seg("span", "một", "")}</li><li>${seg("span", "hai", "")}</li></ul>`);
  assert.equal(plainText("Giá 5* sao"), "Giá 5* sao");
});
