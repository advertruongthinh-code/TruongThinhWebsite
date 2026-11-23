// Orphan-word ties of the build (hero-typography R7), in a module of its own so tests can run it on built HTML.
// No orphan word (hero-typography R7): text-wrap: pretty does not always move a long last word, so every plain-text
// bilingual element (paragraph, label, caption or inline part of a title) ties its last two words with a no-break
// space in VI, EN and the rendered text. A two-word label stays on one line; a separator such as "·" stays with the
// word after it. A heading that ends with an italic part ties that part to the word before it.
// Segments of marked text (data-seg) tie their own last words when they are built (inline-marks.mjs), so they are skipped here.
const TIE_BLOCK = /<([a-z][\w-]*)\b(?![^>]*\bdata-seg\b)([^>]*\bdata-en="[^"]*"[^>]*)>([^<]*)<\/\1>/g;
const TIE_ITALIC_TAIL = /(<\/span>)\s+(<(i|em)\b(?![^>]*\bdata-seg\b)[^>]*>[^<]*<\/\3>\s*<\/h[1-6]>)/g;
const tieLastWord = (text) => {
  const [, lead, body, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const words = body.split(/\s+/);
  if (words.length < 2) return text;
  let glued = words.pop();
  while (words.length > 1 && !/[\p{L}\p{N}]/u.test(words.at(-1))) glued = `${words.pop()}\u00a0${glued}`;
  glued = `${words.pop()}\u00a0${glued}`;
  return `${lead}${[...words, glued].join(" ")}${trail}`;
};
const tieElement = (_match, name, attributes, content) =>
  `<${name}${attributes.replace(/\bdata-(en|vi)="([^"]*)"/g, (_pair, key, value) => `data-${key}="${tieLastWord(value)}"`)}>${tieLastWord(content)}</${name}>`;
// Page copy only: <head>, header and menu labels stay as written (exact strings for title, nav and their tests).
export const tieOrphans = (html) => html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/, (_match, open, body, close) =>
  open + body.replace(TIE_BLOCK, tieElement).replace(TIE_ITALIC_TAIL, "$1\u00a0$2") + close);
