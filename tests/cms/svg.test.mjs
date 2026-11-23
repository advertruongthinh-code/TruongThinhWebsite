// SVG logo check (cms-plan part 2 K9, E8): every rejection rule has a fixture; the real logos in the repo all pass.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { isSafeSvg, svgViewBox } from "../../src/cms/svg.mjs";

const LOGOS = "src/site/assets/content/client-logos";
const svg = (inner, attrs = "") => `<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"${attrs}>${inner}</svg>`;
const OK = '<path fill="#000" d="M0 0h10v10z"/>';

test("every logo in the repo passes and has a viewBox", () => {
  const files = readdirSync(LOGOS).filter((file) => file.endsWith(".svg"));
  assert.ok(files.length >= 3);
  for (const file of files) {
    const text = readFileSync(`${LOGOS}/${file}`, "utf8");
    assert.ok(isSafeSvg(text), file);
    assert.equal(svgViewBox(text).length, 4, file);
  }
});

test("accepted: BOM, XML declaration, comments, a DOCTYPE without a subset, xlink namespace, internal url() and href", () => {
  const illustrator = `﻿<?xml version="1.0" encoding="utf-8"?>\n<!-- Generator: Adobe Illustrator 24.0.0, SVG Export Plug-In -->\n`
    + `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n`
    + svg(`<style type="text/css">.st0{fill:url(#g);}</style><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>`
      + `<path class="st0" d="M0 0h1z"/><use xlink:href="#g"/><use href='#g'/><rect fill="url('#g')" width="1" height="1"/>`, ' xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"');
  assert.ok(isSafeSvg(illustrator));
  assert.deepEqual(svgViewBox(illustrator), [0, 0, 10, 10]);
  assert.ok(isSafeSvg(svg(`<text>A &amp; B</text>${OK}`)));
  assert.ok(isSafeSvg(svg(`<title>Metadata: logo</title><style><![CDATA[.a{fill:url(#f)}]]></style>`
    + `<filter id="f"><feGaussianBlur stdDeviation="1"/><feOffset dx="1"/></filter><path class="a" filter="url(#f)" d="M0 0h1z"/>`,
  ' xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"')));
});

test("rejected: one fixture per rule", () => {
  const bad = {
    script: svg(`<script>alert(1)</script>${OK}`),
    "script, upper case": svg(`<SCRIPT>alert(1)</SCRIPT>${OK}`),
    "event handler": svg(`<path onload="alert(1)" d="M0 0"/>`),
    "event handler after a quote": svg(`<path d="M0 0"onclick="alert(1)"/>`),
    foreignObject: svg(`<foreignObject><div/></foreignObject>`),
    "unknown element (image)": svg(`<image href="#a"/>`),
    "unknown element (a)": svg(`<a>${OK}</a>`),
    "unknown element (animate)": svg(`<animate attributeName="x"/>`),
    "external href": svg(`<use href="https://evil.test/x.svg#a"/>`),
    "external xlink:href": svg(`<use xlink:href="other.svg#a"/>`),
    "unquoted href": svg(`<use href=#a />`),
    "javascript: url": svg(`<use href="#a" style="x:javascript:alert(1)"/>`),
    "data: url": svg(`<rect fill="url(data:image/png;base64,AA)"/>`),
    "data: text": svg(`<desc>data:text/html,x</desc>${OK}`),
    "external url()": svg(`<rect fill="url(https://evil.test/a)"/>`),
    "relative url()": svg(`<rect fill="url(a.svg#g)"/>`),
    "@import": svg(`<style>@import "x.css";</style>`),
    "http text": svg(`<desc>https://evil.test</desc>${OK}`),
    ENTITY: `<!DOCTYPE svg [<!ENTITY a "b">]>${svg(OK)}`,
    "DOCTYPE with internal subset": `<!DOCTYPE svg [ ]>${svg(OK)}`,
    "ENTITY inside the root": svg(`<!ENTITY a "b">${OK}`),
    "DOCTYPE subset inside the root": svg(`<!DOCTYPE x [ ]>${OK}`),
    "character reference": svg(`<use href="#a" style="&#106;avascript:x"/>`),
    "processing instruction": svg(`<?xml-stylesheet href="x.css"?>${OK}`),
    "control character": svg(`<desc>a\u0001b</desc>${OK}`),
    "CSS escape hiding @import": svg(`<style>@\\69mport "//evil.test/x.css";</style>${OK}`),
    "CSS escape hiding url()": svg(`<rect style="fill:u\\72l(//evil.test/a.svg#p)"/>`),
    "xml:base": `<svg viewBox="0 0 1 1" xml:base="//evil.test/"><use href="#a"/></svg>`,
    "< in a DOCTYPE opens a comment the check would strip": `<!DOCTYPE svg SYSTEM "<!--">${svg(`<g a="-->"><script>alert(1)</script></g>`)}`,
    "< in an attribute value": svg(`<g a="<!--"><script>alert(1)</script></g><g b="-->"/>`),
    "element named with an _ prefix": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><_:script xmlns:_="http://www.w3.org/2000/svg">document.title="PWNED"</_:script></svg>`,
    "element with an svg-namespace prefix": svg(`<x:script xmlns:x="http://www.w3.org/2000/svg">alert(1)</x:script>`),
    "comment opened and closed inside CDATA": svg(`<style><![CDATA[ <!-- ]]></style><script>document.title="PWNED"</script><style><![CDATA[ --> ]]></style>`),
    "prefixed element of an editor": svg(`<i:pgf xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/">x</i:pgf>${OK}`),
    "root is not svg": `<g>${svg(OK)}</g>`,
    "text after the root": `${svg(OK)}junk`,
    "no viewBox": `<svg xmlns="http://www.w3.org/2000/svg">${OK}</svg>`,
    "viewBox without area": `<svg viewBox="0 0 0 10">${OK}</svg>`,
    "viewBox with three numbers": `<svg viewBox="0 0 10">${OK}</svg>`,
  };
  for (const [rule, text] of Object.entries(bad)) assert.equal(isSafeSvg(text), false, rule);
  assert.equal(isSafeSvg(null), false);
  assert.equal(svgViewBox(`<svg xmlns="http://www.w3.org/2000/svg">${OK}</svg>`), null);
});
