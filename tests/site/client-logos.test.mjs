// Client logo strip built from client-logos.json (cms-plan part 2 K9, E8).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fillClientLogos, renderClientLogos } from "../../scripts/site/client-logos.mjs";

const partial = readFileSync("src/site/partials/client-logos.html", "utf8").trimEnd();
const page = `<main>\n${partial.replace(/^/gm, "  ")}\n  <p>after</p>\n</main>\n`;
const logos = [{ id: "a", name: 'A & "B"', src: "/assets/content/client-logos/a.svg" }, { id: "b", name: "B", src: "https://media.example/v/k/b.svg" }];

test("two groups, the copy hidden with empty alt; names and srcs escaped; order kept", () => {
  const html = fillClientLogos(page, logos);
  const groups = [...html.matchAll(/<div class="client-logo-marquee__group"([^>]*)>([\s\S]*?)<\/div>/g)];
  assert.deepEqual(groups.map(([, attrs]) => attrs), ["", ' aria-hidden="true"']);
  for (const [, , inner] of groups) assert.deepEqual([...inner.matchAll(/src="([^"]+)"/g)].map(([, src]) => src), logos.map(({ src }) => src));
  assert.match(groups[0][2], /alt="A &amp; &quot;B&quot;"/);
  assert.deepEqual([...groups[1][2].matchAll(/alt="([^"]*)"/g)].map(([, alt]) => alt), ["", ""]);
  assert.doesNotMatch(html, /<!-- client-logos -->/);
  assert.equal(renderClientLogos(logos).split("\n").filter(Boolean).length, 8);
});

test("an empty list drops the section; a strip without the marker stops the build; other pages are untouched", () => {
  assert.equal(fillClientLogos(page, []), "<main>\n  <p>after</p>\n</main>\n");
  assert.throws(() => fillClientLogos(page.replace("<!-- client-logos -->\n", ""), logos, "index.html"), /index\.html: .*<!-- client-logos -->/);
  assert.equal(fillClientLogos("<main></main>", logos), "<main></main>");
});
