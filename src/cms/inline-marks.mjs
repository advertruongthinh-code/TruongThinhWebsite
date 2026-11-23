// Marked text of the CMS (cms-content R8, cms-editor R5, cms-plan part 2 K2): **bold**, *italic*, ^sup^, [text](link), a line break
// in a paragraph, U+00A0 kept. One pure module for build, preview and Worker. Every other HTML character is escaped, so no raw
// HTML reaches the page. The site keeps its two-locale model: each segment is a leaf element with VI inside and EN in data-en.
import { escapeHtml } from "../../scripts/site/lib-pure.mjs";
import { LINK, hrefAttrs, resolveLink } from "./links.mjs";

// Where each kind of text slot accepts which marks; "list" is the bullet and numbered list of a body paragraph, "paragraph"
// a blank line between paragraphs (only kinds rendered as paragraphs take it).
export const MARKS_BY_KIND = {
  title: ["i", "br"],
  body: ["b", "i", "sup", "a", "br", "list", "paragraph"],
  quote: ["b", "i", "br", "paragraph"],
  small: ["sup"],
  plain: [],
};
const MARK_TAG = { b: "strong", i: "em", sup: "sup", text: "span" };
const ESCAPABLE = new Set(["*", "^", "[", "\\"]);
const MARK_START = new Set(["*", "^", "["]);
const shape = (message, code) => ({ message, level: "shape", code });

// One line of text, no line breaks: returns { tokens, errors }. Text inside a mark is plain (escapes allowed); marks do not nest.
function scanLine(line, tokens, errors) {
  let text = "";
  const flush = () => { if (text) tokens.push({ t: "text", s: text }); text = ""; };
  // Plain text from `from` up to the closing string; null when a mark starts inside or the close is missing.
  const inner = (from, close) => {
    let out = "";
    for (let at = from; at < line.length; at += 1) {
      const character = line[at];
      if (character === "\\" && ESCAPABLE.has(line[at + 1])) { out += line[at + 1]; at += 1; continue; }
      if (line.startsWith(close, at)) return { s: out, end: at + close.length };
      if (MARK_START.has(character)) return { nested: true };
      out += character;
    }
    return null;
  };
  for (let at = 0; at < line.length; at += 1) {
    const character = line[at];
    if (character === "\\" && ESCAPABLE.has(line[at + 1])) { text += line[at + 1]; at += 1; continue; }
    if (!MARK_START.has(character)) { text += character; continue; }
    const [type, open, close] = line.startsWith("**", at) ? ["b", 2, "**"] : character === "*" ? ["i", 1, "*"] : character === "^" ? ["sup", 1, "^"] : ["a", 1, "]("];
    const found = inner(at + open, close);
    if (!found) { errors.push(shape(`"${line}": ${close === "](" ? "[" : close} has no closing mark on the same line`, "mark-unclosed")); return; }
    if (found.nested) { errors.push(shape(`"${line}": marks cannot be nested`, "mark-nested")); return; }
    if (!found.s.trim()) { errors.push(shape(`"${line}": a mark needs text inside`, type === "a" ? "link" : "mark-unclosed")); return; }
    flush();
    if (type !== "a") { tokens.push({ t: type, s: found.s }); at = found.end - 1; continue; }
    const end = line.indexOf(")", found.end);
    const link = end < 0 ? "" : line.slice(found.end, end);
    if (!LINK.test(link)) { errors.push(shape(`"${line}": link must be page:<id>, contact:<channel> or https://…`, "link")); return; }
    tokens.push({ t: "a", s: found.s, link });
    at = end;
  }
  flush();
}

function scan(text) {
  const tokens = [];
  const errors = [];
  String(text ?? "").split("\n").forEach((line, index) => {
    if (index) tokens.push({ t: "br" });
    scanLine(line, tokens, errors);
  });
  return { tokens, errors };
}

// Tokens of one string: [{ t: "text" | "b" | "i" | "sup" | "a" | "br", s?, link? }]. Throws on bad marks (validate first).
export function parseMarks(text) {
  const { tokens, errors } = scan(text);
  if (errors.length) throw new Error(errors[0].message);
  return tokens;
}
export const skeleton = (tokens) => tokens.filter(({ t }) => t !== "text").map(({ t }) => t).join(",");
// Never throws: text with bad marks comes back as typed (search and related-post ranking must not stop the build).
export const plainText = (text) => {
  const { tokens, errors } = scan(text);
  return errors.length ? String(text ?? "") : tokens.map((token) => (token.t === "br" ? "\n" : token.s)).join("");
};

// Paragraphs split by a blank line, as the block renderer does.
export const paragraphs = (text) => String(text ?? "").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
// A paragraph whose every line starts with "• " (ul) or "<n>. " (ol) is a list; returns null otherwise.
const LIST = { ul: /^• /, ol: /^(\d+)\. / };
export function listOf(paragraph) {
  const lines = paragraph.split("\n");
  for (const [tag, pattern] of Object.entries(LIST)) {
    if (lines.every((line) => pattern.test(line))) return { tag, start: tag === "ol" ? Number(lines[0].match(pattern)[1]) : 1, items: lines.map((line) => line.replace(pattern, "")) };
  }
  return null;
}

// Tie the last two words of the whole token list with U+00A0, same rule as tieLastWord of the build: a word without a letter or
// digit (a separator such as "·") stays with the word after it. Only spaces and tabs split words; an author's U+00A0 is kept.
function tieTokens(tokens) {
  const tail = tokens.slice(tokens.findLastIndex(({ t }) => t === "br") + 1).filter((token) => token.s !== undefined);
  const chars = tail.flatMap((token, index) => [...token.s].map((character, offset) => ({ index, offset, character })));
  const words = [];
  for (const [at, { character }] of chars.entries()) {
    const space = /[ \t\n]/.test(character);
    if (!space && (!at || /[ \t\n]/.test(chars[at - 1].character))) words.push({ start: at, text: "" });
    if (!space) words.at(-1).text += character;
  }
  if (words.length < 2) return;
  const glue = new Set();
  let last = words.length - 1;
  glue.add(last);
  while (last > 1 && !/[\p{L}\p{N}]/u.test(words[last - 1].text)) glue.add((last -= 1));
  const replace = new Map();
  for (const word of glue) {
    let at = words[word].start - 1;
    replace.set(at, "\u00a0");
    while (at > 0 && /[ \t\n]/.test(chars[at - 1].character)) replace.set((at -= 1), "");
  }
  const parts = tail.map((token) => [...token.s]);
  for (const [at, value] of replace) parts[chars[at].index][chars[at].offset] = value;
  tail.forEach((token, index) => { token.s = parts[index].join(""); });
}

// text, mark, text, mark, …, text: every mark (and break) sits between two text slots, empty or not.
const slots = (tokens) => tokens.reduce((list, token) => {
  if (token.t === "text") list[list.length - 1] = token;
  else list.push(token, { t: "text", s: "" });
  return list;
}, [{ t: "text", s: "" }]);

function segmentsHtml(viTokens, enTokens, ctx) {
  tieTokens(viTokens);
  tieTokens(enTokens);
  const en = slots(enTokens);
  return slots(viTokens).map((vi, index) => {
    if (vi.t === "br") return "<br>";
    const pair = en[index] ?? { t: "text", s: "" }; // EN may be empty (E2) or not validated yet
    if (vi.t === "text" && !vi.s && !pair.s) return "";
    const text = ` data-en="${escapeHtml(pair.s)}" data-vi="${escapeHtml(vi.s)}" data-seg>${escapeHtml(vi.s)}`;
    const target = vi.t === "a" ? resolveLink(vi.link, ctx) : null;
    if (vi.t === "a" && target) {
      const external = target.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a ${hrefAttrs(escapeHtml(target.vi), escapeHtml(resolveLink(pair.link, ctx)?.en ?? target.en))}${external}${text}</a>`;
    }
    const tag = MARK_TAG[vi.t] ?? "span";
    return `<${tag}${text}</${tag}>`;
  }).join("");
}

// Inner HTML of one marked text (no paragraph or list), or null when VI has no mark and no break: callers then keep their
// existing plain-text path, so current data renders the same HTML. Call only with text that passed marksErrors.
export function markedInner(vi, en, ctx = {}) {
  const viTokens = parseMarks(vi);
  // Plain only when both sides read as typed: an escape (5\^) must render without its backslash, so it takes the segment path.
  const asTyped = (text, tokens) => tokens.every(({ t }) => t === "text") && tokens.map(({ s }) => s).join("") === String(text ?? "");
  if (asTyped(vi, viTokens) && asTyped(en, parseMarks(en))) return null;
  return segmentsHtml(viTokens, parseMarks(en), ctx);
}

// A list paragraph as <ul> or <ol>; every item is a row of segments, so the parent never carries data-en.
export function listHtml(vi, en, ctx = {}) {
  const viList = listOf(vi);
  const enItems = listOf(en ?? "")?.items ?? [];
  const start = viList.tag === "ol" && viList.start !== 1 ? ` start="${viList.start}"` : "";
  return `<${viList.tag}${start}>${viList.items.map((item, index) => `<li>${segmentsHtml(parseMarks(item), parseMarks(enItems[index] ?? ""), ctx)}</li>`).join("")}</${viList.tag}>`;
}

// Errors of one side only; allowed is a MARKS_BY_KIND key or a list of token types.
export function sideMarksErrors(text, allowed) {
  const kinds = new Set(typeof allowed === "string" ? MARKS_BY_KIND[allowed] : allowed);
  const { tokens, errors } = scan(text);
  // A plain field renders as typed, so an escape would show its backslash there.
  if (!kinds.size && /\\[*^[\\]/.test(String(text ?? ""))) errors.push(shape(`"${text}": escapes are not allowed here`, "mark-not-allowed"));
  for (const type of new Set(tokens.map(({ t }) => t))) {
    if (type !== "text" && !kinds.has(type)) errors.push(shape(`"${text}": ${type === "br" ? "a line break" : `mark ${type}`} is not allowed here`, "mark-not-allowed"));
  }
  return errors;
}

// Errors of a VI and EN pair: syntax, allowed marks, and the same mark sequence on both sides (per paragraph and list item).
export function marksErrors(vi, en, allowed) {
  const kinds = typeof allowed === "string" ? MARKS_BY_KIND[allowed] : allowed;
  // Empty EN (optional EN, cms-content R2): only VI is checked; whether EN is required is the caller's rule.
  if (!String(en ?? "").trim()) return !String(vi ?? "").trim() ? [] : marksErrors(vi, vi, kinds).filter((error, index, list) => list.findIndex(({ message }) => message === error.message) === index);
  const lists = kinds.includes("list");
  const errors = [];
  const pair = (viText, enText) => {
    const found = [...sideMarksErrors(viText, kinds), ...sideMarksErrors(enText, kinds)];
    if (found.length) return errors.push(...found);
    if (skeleton(parseMarks(viText)) !== skeleton(parseMarks(enText))) errors.push(shape(`"${viText}": VI and EN must use the same marks and line breaks in the same order`, "marks-mismatch"));
  };
  // A blank line is a paragraph break only where the field renders paragraphs; elsewhere it would print two <br>.
  const split = kinds.includes("paragraph") ? paragraphs : (text) => [String(text ?? "")];
  for (const text of kinds.includes("paragraph") ? [] : [vi, en]) if (/\n\s*\n/.test(String(text ?? ""))) errors.push(shape(`"${text}": a blank line is not allowed here`, "mark-not-allowed"));
  const viParts = split(vi);
  const enParts = split(en);
  for (const [index, viPart] of viParts.entries()) {
    const enPart = enParts[index] ?? "";
    const viList = lists ? listOf(viPart) : null;
    const enList = lists ? listOf(enPart) : null;
    if (!viList && !enList) { pair(viPart, enPart); continue; }
    if (viList?.tag !== enList?.tag || viList.items.length !== enList.items.length) { errors.push(shape(`"${viPart}": VI and EN lists must have the same kind and number of lines`, "list-mismatch")); continue; }
    viList.items.forEach((item, line) => pair(item, enList.items[line]));
  }
  return errors;
}

// Writing checks of cms-editor R5 (warnings, the editor underlines them): an intentional line break must not end with , . or ;
// (the break carries the pause, hero-typography R7), and a word must not stand alone on the line after a break.
export const LINE_END_PUNCT = /[,.;]\s*$/;
export function typoWarnings(text) {
  const lines = String(text ?? "").split("\n");
  return lines.flatMap((line, index) => [
    ...(index < lines.length - 1 && line.trim() && LINE_END_PUNCT.test(line) ? [{ code: "line-end-punct", message: `"${line}": a line must not end with , . or ;` }] : []),
    ...(index > 0 && /^\S+$/.test(line.trim()) && lines[index - 1].trim() ? [{ code: "lone-word", message: `"${line}": one word alone after a line break` }] : []),
  ]);
}
