// Search session of this tab (advertising-search R10): the query lives in sessionStorage and never on a server; the text also shows in
// the address bar as #q= so the link can be copied (owner 2026-11-18). Images wait for the share link (P8).
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
// The text in the address bar, keeping the history entry's state (the grid's browse state lives there).
const writeHash = (text) => {
  const url = new URL(location.href);
  url.hash = text ? `q=${encodeURIComponent(text)}` : "";
  if (url.href === location.href) return;
  try { history.replaceState(history.state, "", text ? url.href : `${url.pathname}${url.search}`); } catch {}
};

export function save({ text, images = [] }) {
  writeHash(text);
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
  writeHash("");
  try { sessionStorage.removeItem(SESSION); } catch {}
}

export function markRestore() {
  try { sessionStorage.setItem(RESTORE, "1"); } catch {}
}

// #q= (owner 2026-11-18); #tim= links made before still open.
const fromHash = (hash) => {
  const part = hash.slice(1).split("&").find((entry) => /^(q|tim)=/.test(entry));
  try { return part ? decodeURIComponent(part.slice(part.indexOf("=") + 1)) : null; } catch { return null; }
};

// Search to run again on mount ({ text, images } or null): a #q= link (text only), a language switch, or a reload/Back of this
// page. A soft navigation from the menu starts clean.
export function restored(softNavigation) {
  const hash = take(HASH);
  const restore = take(RESTORE);
  if (hash) {
    const text = fromHash(hash);
    return text ? { text, images: [] } : null;
  }
  const type = performance.getEntriesByType("navigation")[0]?.type;
  if (!restore && (softNavigation || (type !== "reload" && type !== "back_forward"))) return null;
  try {
    const { text = "", images = [] } = JSON.parse(read(SESSION)) ?? {};
    return text || images.length ? { text, images } : null;
  } catch {
    return null;
  }
}
