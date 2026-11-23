// Slots of the standard pages (cms-plan part 2 K7, task E6): every editable text and image in <main> of the home,
// residential, commercial and about pages carries data-slot="<section>.<name>"; the page-copy record of a page fills them.
// Pure module, no Node built-ins: build, Worker, seed and tests share it.
import { htmlElements } from "./html-elements.mjs";
import { escapeHtml } from "./lib-pure.mjs";
import { markedInner } from "../../src/cms/inline-marks.mjs";
import { resolveLink } from "../../src/cms/links.mjs";

export const SLOT_ID = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
// Page-copy record id -> source page.
export const SLOT_PAGES = { home: "index.html", residential: "residential/index.html", commercial: "commercial/index.html", about: "about/index.html" };
// An empty text slot shows this sentence, cut to the length of the source text (K7).
export const PLACEHOLDER_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
// An empty image slot shows the placeholder of its frame direction.
export const PLACEHOLDER_IMAGES = {
  landscape: { src: "/assets/content/projects/placeholder-ngang.webp", width: 3072, height: 2048 },
  portrait: { src: "/assets/content/projects/placeholder-doc.webp", width: 2048, height: 3072 },
};

const BLOCK = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "figcaption", "li", "a", "button"]);
const INLINE = new Set(["span", "i", "em", "br"]);
// Regions the build writes (hero slides, supplier and client logo strips): not slots.
const GENERATED = /(^|\s)(hero-slides|supplier-logos|client-logos)(\s|$)/;
const CONTENT_IMAGE = /^\/assets\/content\//;

export function attrOf(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}(?=[\\s=/>])(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+)))?`, "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}
const setAttr = (tag, name, value) => (attrOf(tag, name) === null
  ? tag.replace(/^<[a-z][\w-]*/i, (open) => `${open} ${name}="${value}"`)
  : tag.replace(new RegExp(`(\\s${name})\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i"), (_, head) => `${head}="${value}"`));
const dropAttr = (tag, name) => tag.replace(new RegExp(`\\s+${name}(?:\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+))?(?=[\\s/>])`, "i"), "");
const decode = (text) => text.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

// Elements with parent and children links; void and unclosed elements end where their tag ends.
function tree(html) {
  const elements = htmlElements(html).map((element) => ({ ...element, end: element.end ?? element.contentStart, children: [] }));
  const stack = [];
  for (const element of elements) {
    while (stack.length && stack.at(-1).end <= element.start) stack.pop();
    element.parent = stack.at(-1) ?? null;
    element.parent?.children.push(element);
    if (element.end > element.contentStart) stack.push(element);
  }
  return elements;
}
const ancestors = function* (element) {
  for (let node = element.parent; node; node = node.parent) yield node;
};

// Text of an element as the editor field shows it (K2 marks): i and em are *…*, br a line break, source whitespace one space.
// en reads data-en of a child that has one instead of its text.
function marked(html, element, en) {
  const text = (from, to) => decode(html.slice(from, to)).replace(/\s+/g, " ");
  let out = "";
  let at = element.contentStart;
  for (const child of element.children) {
    out += text(at, child.start);
    if (child.name === "br") out += "\n";
    else {
      const inner = en && attrOf(child.tag, "data-en") !== null ? decode(attrOf(child.tag, "data-en")) : marked(html, child, en);
      out += child.name === "i" || child.name === "em" ? `*${inner.trim()}*` : inner;
    }
    at = child.end;
  }
  return out + text(at, element.contentEnd ?? at);
}
const tidy = (text) => text.replace(/ {2,}/g, " ").replace(/ ?\n ?/g, "\n").trim();
// VI and EN of a text slot element, read from the HTML: the value the seed writes and the build compares against.
export function slotText(html, element) {
  const own = attrOf(element.tag, "data-en");
  return { vi: tidy(marked(html, element, false)), en: own !== null ? tidy(decode(own)) : tidy(marked(html, element, true)) };
}
const simpleInline = (element) => element.children.every((child) => INLINE.has(child.name) && attrOf(child.tag, "class") === null && simpleInline(child));
const LABEL = /kicker|label|eyebrow/;
const baseName = (element) => {
  if (LABEL.test(attrOf(element.tag, "class") ?? "")) return "label";
  if (/^h[1-6]$/.test(element.name)) return "title";
  return { p: "body", figcaption: "caption", a: "link", button: "link" }[element.name] ?? "text";
};
export const textKindOf = (id) => {
  const name = id.split(".").at(-1).replace(/-\d+$/, "");
  return name === "title" || name === "body" ? name : "small";
};

// Slot targets by the K7 rules, in source order: { element, section, name, kind: "text" | "media" }. assign-slots.mjs names them.
export function slotTargets(html) {
  const elements = tree(html);
  const main = elements.find(({ name }) => name === "main");
  if (!main) return [];
  const excluded = (element) => [element, ...ancestors(element)].some((node) => node.name === "noscript" || GENERATED.test(attrOf(node.tag, "class") ?? "") || attrOf(node.tag, "data-cta") !== null);
  const inMain = (element) => element.start > main.start && element.end <= main.end;
  const sectionOf = (element) => [element, ...ancestors(element)].find((node) => node.name === "section") ?? [element, ...ancestors(element)].find((node) => node.parent === main);
  const targets = [];
  const seen = new Set();
  for (const element of elements) {
    if (!inMain(element) || excluded(element)) continue;
    if (element.name === "img" && CONTENT_IMAGE.test(attrOf(element.tag, "src") ?? "")) {
      targets.push({ element, section: sectionOf(element), name: "image", kind: "media" });
      continue;
    }
    if (attrOf(element.tag, "data-en") === null || element.name === "img") continue;
    const block = [element, ...ancestors(element)].find((node) => BLOCK.has(node.name) && inMain(node));
    // A block whose text children are plain span, i, em and br is one slot; otherwise every data-en leaf is its own small slot.
    const target = block && simpleInline(block) && !block.children.some(({ name }) => name === "img") ? block : element;
    if (seen.has(target)) continue;
    seen.add(target);
    targets.push({ element: target, section: sectionOf(target), name: target === element && block !== element ? (LABEL.test(attrOf(element.tag, "class") ?? "") ? "label" : "text") : baseName(target), kind: "text" });
  }
  return targets.toSorted((left, right) => left.element.start - right.element.start);
}

// The id of every slot target: <section>.<name>, numbered -1, -2 … within a section when a name repeats.
export function slotIds(html) {
  const targets = slotTargets(html);
  const sectionNames = new Map();
  const used = new Map();
  for (const { section } of targets) {
    if (!section || sectionNames.has(section)) continue;
    const raw = attrOf(section.tag, "id") ?? (attrOf(section.tag, "class") ?? "page").split(/\s+/)[0].replace(/^(detail|about)-/, "");
    const base = raw === "top" ? "hero" : raw;
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    sectionNames.set(section, count > 1 ? `${base}-${count}` : base);
  }
  const totals = new Map();
  for (const target of targets) {
    const key = `${sectionNames.get(target.section)}.${target.name}`;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const counters = new Map();
  return targets.map((target) => {
    const key = `${sectionNames.get(target.section)}.${target.name}`;
    const index = (counters.get(key) ?? 0) + 1;
    counters.set(key, index);
    return { ...target, id: totals.get(key) > 1 || target.kind === "media" ? `${key}-${index}` : key };
  });
}

const slotElements = (html) => {
  const elements = tree(html);
  const main = elements.find(({ name }) => name === "main");
  return main ? elements.filter((element) => element.start > main.start && element.end <= main.end && attrOf(element.tag, "data-slot") !== null) : [];
};
const ratioOf = (element) => Number((Number(attrOf(element.tag, "width")) / Number(attrOf(element.tag, "height"))).toFixed(4));
// Slots a page carries: [{ id, kind: "text" | "media", marks, ratio }] (marks for text, ratio width/height for media).
export const slotsOf = (html) => slotElements(html).map((element) => {
  const id = attrOf(element.tag, "data-slot");
  return element.name === "img" ? { id, kind: "media", ratio: ratioOf(element) } : { id, kind: "text", marks: textKindOf(id) };
});
// The page-copy data a page's own HTML gives: every slot with the text and image it has now (the seed).
export function slotValues(html) {
  const slots = {};
  for (const element of slotElements(html)) {
    const id = attrOf(element.tag, "data-slot");
    if (element.name === "img") {
      const src = attrOf(element.tag, "src");
      slots[id] = { src, width: Number(attrOf(element.tag, "width")), height: Number(attrOf(element.tag, "height")),
        altVi: decode(attrOf(element.tag, "alt") ?? ""), altEn: decode(attrOf(element.tag, "data-en-alt") ?? attrOf(element.tag, "alt") ?? "") };
    } else slots[id] = slotText(html, element);
  }
  return slots;
}

const isEmptyText = (value) => !String(value?.vi ?? "").trim();
const isEmptyMedia = (value) => !value?.src;
const sameMedia = (a, b) => ["src", "width", "height", "altVi", "altEn"].every((key) => a[key] === b[key]);
const placeholderText = (source) => {
  const cut = PLACEHOLDER_TEXT.slice(0, Math.max(source.length, 5));
  return cut.length < PLACEHOLDER_TEXT.length ? cut.replace(/\s+\S*$/, "") || cut : cut;
};

// Fills the slots of a standard page from its page-copy record ({ slots }); a slot whose value equals what the HTML already
// has stays byte for byte, so an untouched page builds as before. A record without slots leaves the HTML as is.
// ctx.warn(message) hears about record keys the page no longer has.
export function fillSlots(html, record, ctx = {}) {
  const slots = record?.slots;
  if (!slots || !Object.keys(slots).length) return html;
  const elements = slotElements(html);
  const ids = new Set(elements.map((element) => attrOf(element.tag, "data-slot")));
  for (const key of Object.keys(slots)) if (!ids.has(key)) ctx.warn?.(`page-copy slot ${key} is not on the page`);
  const source = slotValues(html);
  const edits = [];
  for (const element of elements) {
    const id = attrOf(element.tag, "data-slot");
    // A slot the record does not name keeps the page's own content (cms-editor R6); a named empty one shows the placeholder.
    if (!Object.hasOwn(slots, id)) continue;
    if (element.name === "img") {
      const value = isEmptyMedia(slots[id]) ? { ...PLACEHOLDER_IMAGES[ratioOf(element) >= 1 ? "landscape" : "portrait"], altVi: "", altEn: "" } : slots[id];
      if (sameMedia(value, source[id])) continue;
      let tag = setAttr(setAttr(setAttr(setAttr(element.tag, "src", escapeHtml(value.src)), "width", value.width), "height", value.height), "alt", escapeHtml(value.altVi ?? ""));
      tag = value.altEn ? setAttr(tag, "data-en-alt", escapeHtml(value.altEn)) : dropAttr(tag, "data-en-alt");
      edits.push({ start: element.start, end: element.contentStart, text: tag });
      continue;
    }
    const value = isEmptyText(slots[id]) ? { vi: placeholderText(source[id].vi), en: placeholderText(source[id].en || source[id].vi) } : slots[id];
    const en = String(value.en ?? "").trim() ? value.en : value.vi;
    if (value.vi === source[id].vi && en === source[id].en) continue;
    const segments = markedInner(value.vi, en);
    const tag = segments === null ? setAttr(element.tag, "data-en", escapeHtml(en)) : dropAttr(element.tag, "data-en");
    edits.push({ start: element.start, end: element.contentEnd, text: tag + (segments ?? escapeHtml(value.vi)) });
  }
  return edits.toSorted((left, right) => right.start - left.start).reduce((out, { start, end, text }) => out.slice(0, start) + text + out.slice(end), html);
}

// Contact links and CTA buttons (cms-plan part 2 K8, task E7): every element with data-channel="<channel>" or
// data-cta="<key>" gets its href and text from contact.json. The source writes href="#"; an empty channel renders the
// disabled form of the footer socials. aria-label follows cta.aria, or the text when the button has no label span.
const DISABLED = ' role="link" aria-disabled="true" tabindex="-1"';
export const CONTACT_CHANNELS = ["zalo", "hotline", "office", "facebook", "tiktok", "youtube"];
// Every data-cta key of the page sources and partials; the CMS edits their text and channel, never adds or removes one.
export const CTA_KEYS = ["floating", "floating-project", "floating-advertising", "menu", "contact-quick", "home-1", "home-2",
  "residential-1", "commercial-1", "about-1", "advertising-1", "advertising-2"];
export function fillContact(html, contact) {
  const elements = tree(html);
  const edits = [];
  const linkTag = (element, href) => {
    const disabled = attrOf(element.tag, "aria-disabled") === "true";
    if (!href) return disabled ? element.tag : ["href", "target", "rel"].reduce(dropAttr, element.tag).replace(/^<a\b/, `<a${DISABLED}`);
    const tag = setAttr(["role", "aria-disabled", "tabindex"].reduce(dropAttr, element.tag), "href", escapeHtml(href));
    return disabled && href.startsWith("https://") ? tag.replace(/^<a\b/, '<a target="_blank" rel="noreferrer"') : tag;
  };
  const replaceInner = (element, text) => edits.push({ start: element.contentStart, end: element.contentEnd, text: escapeHtml(text) });
  for (const element of elements) {
    const channelKey = attrOf(element.tag, "data-channel");
    const ctaKey = attrOf(element.tag, "data-cta");
    if (channelKey === null && ctaKey === null) continue;
    const cta = ctaKey === null ? null : contact.cta?.[ctaKey];
    if (ctaKey !== null && !cta) throw new Error(`contact.json has no cta "${ctaKey}"`);
    const channel = contact.channels?.[cta ? cta.channel : channelKey];
    if (!channel) throw new Error(`contact.json has no channel "${cta ? cta.channel : channelKey}"`);
    const href = resolveLink(`contact:${cta ? cta.channel : channelKey}`, { contact })?.vi ?? "";
    let tag = linkTag(element, href);
    if (cta) {
      const label = element.children.find((child) => child.name === "span" && attrOf(child.tag, "data-en") !== null);
      if (label) edits.push({ start: label.start, end: label.contentEnd, text: setAttr(label.tag, "data-en", escapeHtml(cta.en)) + escapeHtml(cta.vi) });
      const aria = cta.aria ?? (label ? null : cta);
      if (aria) tag = setAttr(setAttr(tag, "aria-label", escapeHtml(aria.vi)), "data-en-aria-label", escapeHtml(aria.en));
    } else if (channel.text) {
      const strong = element.children.find((child) => child.name === "strong");
      if (strong) replaceInner(strong, channel.text);
      else if (!element.children.length) replaceInner(element, channel.text);
    }
    edits.push({ start: element.start, end: element.contentStart, text: tag });
  }
  const out = edits.toSorted((left, right) => right.start - left.start).reduce((text, { start, end, text: value }) => text.slice(0, start) + value + text.slice(end), html);
  // href="#" is only a placeholder in the source: a tag the element walker skipped (inside a script string, say) would
  // point nowhere on the site, so the raw text is checked too.
  const left = out.match(/<[a-z][^<>]*\sdata-(?:cta|channel)="[^"]*"[^<>]*>/gi)?.find((tag) => attrOf(tag, "href") === "#");
  if (left) throw new Error(`contact link left as href="#": ${left.replace(/\s+/g, " ")}`);
  return out;
}
