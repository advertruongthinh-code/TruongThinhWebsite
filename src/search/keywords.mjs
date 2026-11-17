// Keyword layer of advertising search (spec advertising-search R2). Pure functions: no DOM, no network.
// A card's K score is the best match level of the query against the phrases of its title, alt text, product, cluster and tag labels.
import stopwords from "./stopwords.json" with { type: "json" };
import synonyms from "./synonyms.json" with { type: "json" };

const TONES = { "̀": 2, "́": 1, "̃": 4, "̉": 3, "̣": 5 };
const TONE_MARKS = /[̣̀́̃̉]/g;
// Tag groups that name what a card shows; "service" (internal group names) and "framing" (image shape) are not search words.
const TAG_GROUPS = new Set(["product", "variant", "use"]);
const PHRASE_BREAK = /[,;:()[\]/|&–—]+|\s[-.]\s|\.(?=\s|$)/;
const VOWEL = /[aeiouyăâêôơư]/;
const MIN_FUZZY_LETTERS = 3;
const LEVEL = { exact: 1, plain: 0.85, synonym: 0.7, words: 0.7, typo: 0.6, partial: 0.4 };
// Two edits are allowed only between long words: shorter words with two edits are mostly other words ("quang" and "bang").
const TWO_EDIT_LETTERS = 7;

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
  return { key: canon.join(" "), words: canon, plainWords: words.map(plain), typed: words };
}

function labelMaps(artifact) {
  const byId = (list) => new Map((list ?? []).map((entry) => [entry.id, entry]));
  return { products: byId(artifact.products), tags: byId(artifact.tagRegistry) };
}

/**
 * Phrases of one card in one locale ("vi" or "en"): title, every media alt, product and tag labels. A card merged from several
 * products also keeps each merged media's own title and products. The cluster label is left out:
 * it names three products at once ("Bảng hiệu, chữ nổi & hộp đèn"), so every light box would match "chữ nổi" exactly.
 */
export function cardTerms(card, artifact, locale, maps = labelMaps(artifact)) {
  const suffix = locale === "en" ? "En" : "Vi";
  const { products, tags } = maps;
  const label = (map, id) => map.get(id)?.[`label${suffix}`];
  const media = card.mediaItems ?? [card.media];
  const productIds = new Set([...(card.productIds ?? []), ...media.flatMap((item) => item?.productIds ?? [])]);
  const texts = [
    card[`title${suffix}`],
    ...media.flatMap((item) => [item?.[`title${suffix}`], item?.[`alt${suffix}`]]),
    ...[...productIds].map((id) => label(products, id)),
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
const localeIndexes = (artifact) => indexes.get(artifact) ?? indexes.set(artifact, new Map()).get(artifact);
const indexEntry = (card, artifact, locale, maps) => {
  const terms = cardTerms(card, artifact, locale, maps);
  return { id: card.id, terms, wordSet: new Set(terms.flatMap((term) => term.plainWords)), canonSet: new Set(terms.flatMap((term) => term.words)) };
};
// Every word of the locale's index, with and without marks: a typed word found here is a real word, not a typo.
const vocabularies = new WeakMap();
function vocabularyOf(index) {
  if (!vocabularies.has(index)) {
    vocabularies.set(index, { plain: new Set(index.flatMap((entry) => [...entry.wordSet])), canon: new Set(index.flatMap((entry) => [...entry.canonSet])) });
  }
  return vocabularies.get(index);
}
function indexFor(artifact, locale) {
  const perLocale = localeIndexes(artifact);
  if (!perLocale.has(locale)) {
    const maps = labelMaps(artifact);
    perLocale.set(locale, artifact.cards.map((card) => indexEntry(card, artifact, locale, maps)));
  }
  return perLocale.get(locale);
}

/**
 * Builds the same index in slices, one per step, so a page can warm it in idle time before the first search (a cold build is
 * a long task on slow phones). A search before the last step builds the index itself; the steps then stop.
 */
export function* warmIndex(artifact, locale, slice = 40) {
  const perLocale = localeIndexes(artifact);
  const maps = labelMaps(artifact);
  const built = [];
  for (let at = 0; at < artifact.cards.length && !perLocale.has(locale); at += slice) {
    for (const card of artifact.cards.slice(at, at + slice)) built.push(indexEntry(card, artifact, locale, maps));
    yield;
  }
  if (!perLocale.has(locale)) perLocale.set(locale, built);
}

const synonymGroups = {};
const groupsFor = (locale) => (synonymGroups[locale] ??= (synonyms[locale] ?? []).map((group) => group.map((member) => tokens(plain(member)))));

const stopPhrases = {};
const stopsFor = (locale) => (stopPhrases[locale] ??= (stopwords[locale] ?? []).map((entry) => ({ words: tokens(entry).map(canonical), plainWords: tokens(entry).map(plain) })));

// A query word with marks must equal the catalog word with marks; a word typed without marks is compared without marks.
const wordAt = (candidate, i, words, plainWords, at) => (candidate.marked[i] ? words[at] === candidate.words[i] : plainWords[at] === candidate.plainWords[i]);

// The candidate without filler words ("làm", "cho", "quảng cáo"); null when nothing or nothing new is left.
function stripped(candidate, locale) {
  const keep = candidate.words.map(() => true);
  for (const stop of stopsFor(locale)) {
    for (let at = 0; at + stop.words.length <= keep.length; at++) {
      const probe = { ...candidate, words: stop.words, plainWords: stop.plainWords, marked: candidate.marked.slice(at, at + stop.words.length) };
      if (stop.words.every((_, i) => wordAt(probe, i, candidate.words, candidate.plainWords, at + i))) stop.words.forEach((_, i) => (keep[at + i] = false));
    }
  }
  const pick = (list) => list.filter((_, i) => keep[i]);
  const left = pick(candidate.words);
  return left.length && left.length < keep.length
    ? { ...candidate, words: left, plainWords: pick(candidate.plainWords), marked: pick(candidate.marked), kind: "stripped" }
    : null;
}

// Query candidates: the text as typed and, for text without marks, its Telex and VNI readings that gained marks; each also without
// its filler words. Only the typed text (and its stripped copy) gets the typo level: a Telex reading is already a guess.
function candidates(query, locale = "vi") {
  const words = tokens(query);
  const make = (parts, kind) => {
    const marked = parts.map(({ base, tone }) => Boolean(tone) || plain(base) !== base);
    return { words: parts.map(join), plainWords: parts.map(({ base }) => plain(base)), marked, marks: marked.some(Boolean), kind };
  };
  const typed = make(words.map(split), "typed");
  const list = typed.marks ? [typed]
    : [typed, ...[["telex", telexParts], ["vni", vniParts]].map(([kind, decode]) => make(words.map(decode), kind)).filter((candidate) => candidate.marks)];
  return [...list, ...list.map((candidate) => {
    const left = stripped(candidate, locale);
    return left && { ...left, fuzzy: candidate.kind === "typed" };
  }).filter(Boolean)].map((candidate) => ({ fuzzy: candidate.kind === "typed", ...candidate }));
}

// Query copies with one synonym member swapped for another member of its group (plain words). A member typed with one word
// off ("kios" for "kiosk") still swaps; that copy is marked `typo` and scores at the typo level.
function synonymQueries(list, locale, known) {
  const swapped = [];
  for (const { plainWords } of list) {
    for (const group of groupsFor(locale)) {
      for (const from of group) {
        for (let at = 0; at + from.length <= plainWords.length; at++) {
          const off = from.filter((word, i) => plainWords[at + i] !== word);
          if (off.length > 1 || (off.length && !from.some((word, i) => word !== plainWords[at + i] && !known.has(plainWords[at + i]) && closeWords(plainWords[at + i], word)))) continue;
          for (const to of group) {
            if (to !== from) swapped.push({ words: [...plainWords.slice(0, at), ...to, ...plainWords.slice(at + from.length)], typo: off.length > 0 });
          }
        }
      }
    }
  }
  return swapped;
}

const indexOfWords = (hay, needle) => (needle.length ? hay.findIndex((_, at) => needle.every((word, i) => hay[at + i] === word)) : -1);
const contains = (hay, needle) => indexOfWords(hay, needle) >= 0;
// The candidate's words contiguous in the term, each compared with or without marks as typed ("hộp den").
const containsMixed = (term, candidate) => {
  for (let at = 0; at + candidate.words.length <= term.words.length; at++) {
    if (candidate.words.every((_, i) => wordAt(candidate, i, term.words, term.plainWords, at + i))) return true;
  }
  return false;
};

function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

// One word may be off: same first letter, 1 edit, 2 only when both words have 7 letters or more (the tone digit is an edit, not a letter).
// Catalog words repeat across thousands of phrases, so each word pair is judged once per search.
let closeMemo = new Map();
function closeWords(a, b) {
  if (Math.abs(a.length - b.length) > 2 || plain(a)[0] !== plain(b)[0]) return false;
  const key = `${a}|${b}`;
  if (!closeMemo.has(key)) {
    const letters = [a, b].map((word) => (word.match(/\p{L}/gu) ?? []).length);
    closeMemo.set(key, Math.min(...letters) >= MIN_FUZZY_LETTERS && distance(a, b) <= (Math.min(...letters) >= TWO_EDIT_LETTERS ? 2 : 1));
  }
  return closeMemo.get(key);
}

// A word the catalog knows is not a typo of another word ("quang" is quảng, not bảng), unless only its marks differ ("hộp đen").
function containsWithTypo(hay, needle, hayPlain, needlePlain, known) {
  for (let at = 0; at + needle.length <= hay.length; at++) {
    let off = -1;
    let count = 0;
    for (let i = 0; i < needle.length && count < 2; i++) if (hay[at + i] !== needle[i]) { off = i; count++; }
    if (count !== 1 || (known.has(needle[off]) && hayPlain[at + off] !== needlePlain[off])) continue;
    if (closeWords(hay[at + off], needle[off])) return true;
  }
  return false;
}

function phraseLevel(term, list, swaps, vocabulary) {
  let best = 0;
  for (const candidate of list) {
    if (contains(term.words, candidate.words)) return LEVEL.exact;
    if (containsMixed(term, candidate)) best = LEVEL.plain;
  }
  if (!best && swaps.some((swap) => !swap.typo && contains(term.plainWords, swap.words))) best = LEVEL.synonym;
  if (!best && swaps.some((swap) => swap.typo && contains(term.plainWords, swap.words))) best = LEVEL.typo;
  if (!best && list.some((c) => c.fuzzy && (c.marks
    ? containsWithTypo(term.words, c.words, term.plainWords, c.plainWords, vocabulary.canon)
    : containsWithTypo(term.plainWords, c.plainWords, term.plainWords, c.plainWords, vocabulary.plain)))) best = LEVEL.typo;
  return best;
}

// Every word of a 2+ word candidate is somewhere in the card, not necessarily side by side ("hộp đèn inox").
const allWords = (candidate, { wordSet, canonSet }) => candidate.words.length >= 2
  && candidate.words.every((word, i) => (candidate.marked[i] ? canonSet.has(word) : wordSet.has(candidate.plainWords[i])));

/**
 * K score of every card the query reaches, as Map<cardId, 0.4..1>; cards below 0.4 are absent.
 * @param {string} query text typed by the visitor
 * @param {"vi"|"en"} locale
 * @param {{ cards: any[], products?: any[], tagRegistry?: any[] }} artifact advertising catalog artifact
 */
export function keywordScores(query, locale, artifact) {
  const list = candidates(query, locale);
  closeMemo = new Map();
  const scores = new Map();
  if (!list[0].words.length) return scores;
  const index = indexFor(artifact, locale);
  const vocabulary = vocabularyOf(index);
  const swaps = synonymQueries(list, locale, vocabulary.plain);
  const levels = new Map();
  const levelOf = (term) => {
    if (!levels.has(term.key)) levels.set(term.key, phraseLevel(term, list, swaps, vocabulary));
    return levels.get(term.key);
  };
  for (const entry of index) {
    const { id, terms, wordSet } = entry;
    let best = Math.max(0, ...terms.map(levelOf));
    if (best < LEVEL.words && list.some((candidate) => allWords(candidate, entry))) best = LEVEL.words;
    // Half of the words known to the card; a single word is either a match above or nothing.
    if (!best && list.some(({ plainWords: words }) => words.length >= 2 && words.filter((word) => wordSet.has(word)).length * 2 >= words.length)) best = LEVEL.partial;
    if (best) scores.set(id, best);
  }
  return scores;
}

/**
 * Text to send to the embedding model: a Telex or VNI query is replaced by the catalog words it decodes to, with marks
 * ("hoopj ddenf" -> "hộp đèn"), because the model cannot read the raw keys. Any other query is returned as typed.
 */
export function modelQuery(query, locale, artifact) {
  const decoded = candidates(query, locale).filter(({ kind }) => kind === "telex" || kind === "vni");
  for (const { words } of decoded) {
    for (const { terms } of indexFor(artifact, locale)) {
      for (const term of terms) {
        const at = indexOfWords(term.words, words);
        if (at >= 0) return term.typed.slice(at, at + words.length).join(" ");
      }
    }
  }
  return query;
}
