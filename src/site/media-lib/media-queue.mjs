// Shared download queue for card and primary media (media-card R5, owner 2026-11-12). The media being viewed starts first and keeps its own
// slot; other files wait their turn, nearest first, with at most 2 parallel downloads on a phone and 4 on PC. A started download is never
// cancelled: it holds its slot until it ends (or stalls, MEDIA_QUEUE_STALL_MS), so files close to done always finish first.
const PHONE = globalThis.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
export const MEDIA_QUEUE_LIMIT = PHONE ? 2 : 4;
// A download still running after this long stops holding its slot (it keeps running, never cancelled): a stalled connection held its slot
// for good, so with every slot stalled the other media of a card waited until F5 (owner 2026-11-17).
export const MEDIA_QUEUE_STALL_MS = 10_000;

// Loads and decodes the file off the main thread; the page's own img then takes it from the document's image cache with the same URL, complete
// in the same frame, so a strip never decodes it mid-slide.
const loadImage = (url) => {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => { throw new Error(`media failed: ${url}`); });
};

export function createMediaQueue({ limit = MEDIA_QUEUE_LIMIT, load = loadImage, stallMs = MEDIA_QUEUE_STALL_MS } = {}) {
  const entries = new Map();
  let shared = 0;
  let viewing = 0;
  let order = 1;
  // Frees the slot of a running entry; `slot` is what the entry becomes ("done", or "stalled" while it keeps loading).
  const release = (entry, slot) => {
    clearTimeout(entry.stall);
    if (entry.slot === "viewing") viewing -= 1;
    else if (entry.slot === "shared") shared -= 1;
    entry.slot = slot;
    pump();
  };
  const finish = (entry) => release(entry, "done");
  const start = (entry, slot) => {
    entry.slot = slot;
    if (slot === "viewing") viewing += 1;
    else shared += 1;
    entry.stall = setTimeout(() => release(entry, "stalled"), stallMs);
    load(entry.url).then(() => {
      finish(entry);
      entry.resolve();
    }, (error) => {
      finish(entry);
      // A failed file may be asked for again later (the img's own error path decides what to show).
      entries.delete(entry.url);
      entry.reject(error);
    });
  };
  function pump() {
    const waiting = [...entries.values()].filter((entry) => !entry.slot)
      // The latest media the viewer moved to comes first, then the rest by distance, then by request order.
      .sort((a, b) => b.viewedAt - a.viewedAt || a.rank - b.rank || a.order - b.order);
    for (const entry of waiting) {
      if (entry.viewedAt && viewing === 0) start(entry, "viewing");
      else if (shared < limit) start(entry, "shared");
      else if (!entry.viewedAt) break;
    }
  }
  return {
    // rank: distance from the media being viewed (0 first); current: the viewer is on this media now. Asking again only raises priority.
    load(url, { rank = 0, current = false } = {}) {
      let entry = entries.get(url);
      if (!entry) {
        entry = { url, rank, viewedAt: 0, order: order++, slot: null };
        entry.promise = new Promise((resolve, reject) => Object.assign(entry, { resolve, reject }));
        entry.promise.catch(() => {});
        entries.set(url, entry);
      } else if (!entry.slot) {
        entry.rank = Math.min(entry.rank, rank);
      }
      if (current && !entry.slot) entry.viewedAt = order++;
      pump();
      return entry.promise;
    },
    loaded: (url) => entries.get(url)?.slot === "done",
    running: () => shared + viewing,
  };
}

export const mediaQueue = createMediaQueue();
