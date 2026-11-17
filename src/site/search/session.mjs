// Search session of this tab (advertising-search R10): the query lives in sessionStorage, never in the address bar and never on a server.
const SESSION = "tt-search-session";
const HASH = "tt-search-hash"; // written by head-inline.js before motion.js drops the hash
const RESTORE = "tt-search-restore"; // set by a language switch click

const read = (key) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};
const take = (key) => {
  const value = read(key);
  try { sessionStorage.removeItem(key); } catch {}
  return value;
};

// Returns "quota" when the images could not be kept (the text is then saved alone).
export function save({ text, images = [] }) {
  try {
    sessionStorage.setItem(SESSION, JSON.stringify({ text, images }));
  } catch (error) {
    if (error?.name !== "QuotaExceededError" || !images.length) return null;
    try { sessionStorage.setItem(SESSION, JSON.stringify({ text, images: [] })); } catch {}
    return "quota";
  }
  return null;
}

export function clear() {
  try { sessionStorage.removeItem(SESSION); } catch {}
}

export function markRestore() {
  try { sessionStorage.setItem(RESTORE, "1"); } catch {}
}

const fromHash = (hash) => {
  const part = hash.slice(1).split("&").find((entry) => entry.startsWith("tim="));
  try { return part ? decodeURIComponent(part.slice(4)) : null; } catch { return null; }
};

// Query to search again on mount: a #tim= link, a language switch, or a reload/Back of this page. A soft navigation from the menu starts clean.
export function restoredText(softNavigation) {
  const hash = take(HASH);
  const restore = take(RESTORE);
  if (hash) return fromHash(hash);
  const type = performance.getEntriesByType("navigation")[0]?.type;
  if (!restore && (softNavigation || (type !== "reload" && type !== "back_forward"))) return null;
  try { return JSON.parse(read(SESSION))?.text || null; } catch { return null; }
}
