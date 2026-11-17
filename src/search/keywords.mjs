// Keyword layer of advertising search (spec advertising-search R2). Pure functions: no DOM, no network.
// A card's K score is the best match level of the query against the phrases of its title, alt text, product, cluster and tag labels.
import synonyms from "./synonyms.json" with { type: "json" };

const TONES = { "̀": 2, "́": 1, "̃": 4, "̉": 3, "̣": 5 };
const TONE_MARKS = /[̣̀́̃̉]/g;
// Tag groups that name what a card shows; "service" (internal group names) and "framing" (image shape) are not search words.
const TAG_GROUPS = new Set(["product", "variant", "use"]);
const PHRASE_BREAK = /[,;:()[\]/|&–—]+|\s[-.]\s|\.(?=\s|$)/;
const VOWEL = /[aeiouyăâêôơư]/;
const MIN_FUZZY_LETTERS = 3;
const LEVEL = { exact: 1, plain: 0.85, synonym: 0.7, typo: 0.6, partial: 0.4 };

const norm = (text) => text.normalize("NFC").toLowerCase();
const tokens = (text) => norm(text).match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];

/** Lowercase text without any diacritic; đ becomes d. */
export const plain = (text) => norm(text).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();

// A word as base letters (tone mark removed, hat, horn and breve kept) plus tone number 0 to 5.
function split(word) {
  let tone = 0;
  const base = norm(word).normalize("NFD").replace(TONE_MARKS, (mark) => { tone = TONES[mark]; return ""; }).normalize("NFC");
  return { base, tone };
}
const join = ({ base, tone }) => (tone ? base + tone : base);

/** Word with the tone mark moved to the end as a digit, so "hòa" and "hoà" are equal and "hộp" is "hôp5". */
export const canonical = (word) => join(split(word));

const TELEX_PAIRS = { dd: "đ", aa: "â", aw: "ă", ee: "ê", oo: "ô", uow: "ươ", ow: "ơ", uw: "ư" };
function telexParts(word) {
  let text = norm(word);
  if (!/^[a-z]+$/.test(text)) return split(text);
  let tone = 0;
  const toneKey = "sfrxj".indexOf(text.at(-1));
  if (text.length > 1 && toneKey >= 0) {
    tone = toneKey + 1;
    text = text.slice(0, -1);
  }
  // A lone w after a consonant is ư; elsewhere it stays a letter.
  text = text.replace(/dd|aa|aw|ee|oo|uow|ow|uw|w/g, (match, at) => (match !== "w" ? TELEX_PAIRS[match] : at > 0 && !/[aeiouy]/.test(text[at - 1]) ? "ư" : match));
  // A tone key with no vowel is not Telex ("ss"), keep the word as typed.
  return tone && !VOWEL.test(text) ? split(word) : { base: text, tone };
}

function vniParts(word) {
  const text = norm(word);
  if (!/^[a-z0-9]+$/.test(text) || !/\d/.test(text)) return split(text);
  let base = "";
  let tone = 0;
  for (const char of text) {
    const key = Number(char);
    if (!/\d/.test(char)) base += char;
    else if (key >= 1 && key <= 5 && VOWEL.test(base)) tone = key;
    else if (key === 6 && /[aeo]/.test(base)) base = base.replace(/[aeo](?=[^aeo]*$)/, (v) => ({ a: "â", e: "ê", o: "ô" })[v]);
    else if (key === 7 && /uo$/.test(base)) base = `${base.slice(0, -2)}ươ`;
    else if (key === 7 && /[ou]/.test(base)) base = base.replace(/[ou](?=[^ou]*$)/, (v) => ({ o: "ơ", u: "ư" })[v]);
    else if (key === 8 && /a/.test(base)) base = base.replace(/a(?=[^a]*$)/, "ă");
    else if (key === 9 && /d/.test(base)) base = base.replace(/d(?=[^d]*$)/, "đ");
    else base += char;
  }
  return { base, tone };
}

/** Telex word ("hoopj") as a canonical word ("hôp5"); a word that is not Telex comes back canonical, unchanged. */
export const decodeTelex = (word) => join(telexParts(word));
/** VNI word ("ho65p") as a canonical word ("hôp5"); a word that is not VNI comes back canonical, unchanged. */
export const decodeVni = (word) => join(vniParts(word));

// A phrase is the unit of matching: its words contiguous, once with marks and once without.
function phrase(text) {
  const words = tokens(text);
  if (!words.length) return null;
  const canon = words.map(canonical);
  return { key: canon.join(" "), words: canon, plainWords: words.map(plain) };
}

function labelMaps(artifact) {
  const byId = (list) => new Map((list ?? []).map((entry) => [entry.id, entry]));
  return { products: byId(artifact.products), clusters: byId(artifact.clusters), tags: byId(artifact.tagRegistry) };
}

/** Phrases of one card in one locale ("vi" or "en"): title, every media alt, product, cluster and tag labels. */
export function cardTerms(card, artifact, locale, maps = labelMaps(artifact)) {
  const suffix = locale === "en" ? "En" : "Vi";
  const { products, clusters, tags } = maps;
  const label = (map, id) => map.get(id)?.[`label${suffix}`];
  const texts = [
    card[`title${suffix}`],
    ...(card.mediaItems ?? [card.media]).map((media) => media?.[`alt${suffix}`]),
    ...(card.productIds ?? []).map((id) => label(products, id)),
    label(clusters, card.category),
    ...(card.tagIds ?? []).map((id) => (TAG_GROUPS.has(tags.get(id)?.group) ? label(tags, id) : null)),
  ];
  const seen = new Map();
  for (const text of texts) {
    for (const part of String(text ?? "").split(PHRASE_BREAK)) {
      const found = phrase(part);
      if (found) seen.set(found.key, found);
    }
  }
  return [...seen.values()];
}

// The index is built on the first search, not at page load, and kept per artifact and locale.
const indexes = new WeakMap();
function indexFor(artifact, locale) {
  const perLocale = indexes.get(artifact) ?? indexes.set(artifact, new Map()).get(artifact);
  if (!perLocale.has(locale)) {
    const maps = labelMaps(artifact);
    perLocale.set(locale, artifact.cards.map((card) => {
      const terms = cardTerms(card, artifact, locale, maps);
      return { id: card.id, terms, wordSet: new Set(terms.flatMap((term) => term.plainWords)) };
    }));
  }
  return perLocale.get(locale);
}

const synonymGroups = {};
const groupsFor = (locale) => (synonymGroups[locale] ??= (synonyms[locale] ?? []).map((group) => group.map((member) => tokens(plain(member)))));

// Query candidates: the text as typed and, for text without marks, its Telex and VNI readings that gained marks.
function candidates(query) {
  const words = tokens(query);
  const make = (parts) => ({
    words: parts.map(join),
    plainWords: parts.map(({ base }) => plain(base)),
    marks: parts.some(({ base, tone }) => tone || plain(base) !== base),
  });
  const typed = make(words.map(split));
  if (typed.marks) return [typed];
  return [typed, ...[telexParts, vniParts].map((decode) => make(words.map(decode))).filter((candidate) => candidate.marks)];
}

// Query copies with one synonym member swapped for another member of its group (plain words).
function synonymQueries(list, locale) {
  const swapped = [];
  for (const { plainWords } of list) {
    for (const group of groupsFor(locale)) {
      for (const from of group) {
        for (let at = 0; at + from.length <= plainWords.length; at++) {
          if (!from.every((word, i) => plainWords[at + i] === word)) continue;
          for (const to of group) if (to !== from) swapped.push([...plainWords.slice(0, at), ...to, ...plainWords.slice(at + from.length)]);
        }
      }
    }
  }
  return swapped;
}

const contains = (hay, needle) => needle.length > 0 && hay.some((_, at) => needle.every((word, i) => hay[at + i] === word));

function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

// One word may be off: up to 1 edit when the word has at most 4 letters, up to 2 when longer (the tone digit is an edit, not a letter).
// Catalog words repeat across thousands of phrases, so each word pair is judged once per search.
let closeMemo = new Map();
function closeWords(a, b) {
  if (Math.abs(a.length - b.length) > 2) return false;
  const key = `${a}|${b}`;
  if (!closeMemo.has(key)) {
    const letters = [a, b].map((word) => (word.match(/\p{L}/gu) ?? []).length);
    closeMemo.set(key, Math.min(...letters) >= MIN_FUZZY_LETTERS && distance(a, b) <= (Math.max(...letters) <= 4 ? 1 : 2));
  }
  return closeMemo.get(key);
}

function containsWithTypo(hay, needle) {
  for (let at = 0; at + needle.length <= hay.length; at++) {
    let off = -1;
    let count = 0;
    for (let i = 0; i < needle.length && count < 2; i++) if (hay[at + i] !== needle[i]) { off = i; count++; }
    if (count === 1 && closeWords(hay[at + off], needle[off])) return true;
  }
  return false;
}

function phraseLevel(term, list, swaps) {
  let best = 0;
  for (const candidate of list) {
    if (contains(term.words, candidate.words)) return LEVEL.exact;
    if (!candidate.marks && contains(term.plainWords, candidate.plainWords)) best = LEVEL.plain;
  }
  if (!best && swaps.some((swap) => contains(term.plainWords, swap))) best = LEVEL.synonym;
  if (!best && list.some((c) => (c.marks ? containsWithTypo(term.words, c.words) : containsWithTypo(term.plainWords, c.plainWords)))) best = LEVEL.typo;
  return best;
}

/**
 * K score of every card the query reaches, as Map<cardId, 0.4..1>; cards below 0.4 are absent.
 * @param {string} query text typed by the visitor
 * @param {"vi"|"en"} locale
 * @param {{ cards: any[], products?: any[], clusters?: any[], tagRegistry?: any[] }} artifact advertising catalog artifact
 */
export function keywordScores(query, locale, artifact) {
  const list = candidates(query);
  closeMemo = new Map();
  const scores = new Map();
  if (!list[0].words.length) return scores;
  const swaps = synonymQueries(list, locale);
  const levels = new Map();
  const levelOf = (term) => {
    if (!levels.has(term.key)) levels.set(term.key, phraseLevel(term, list, swaps));
    return levels.get(term.key);
  };
  for (const { id, terms, wordSet } of indexFor(artifact, locale)) {
    let best = Math.max(0, ...terms.map(levelOf));
    // Half of the words known to the card; a single word is either a match above or nothing.
    if (!best && list.some(({ plainWords: words }) => words.length >= 2 && words.filter((word) => wordSet.has(word)).length * 2 >= words.length)) best = LEVEL.partial;
    if (best) scores.set(id, best);
  }
  return scores;
}
