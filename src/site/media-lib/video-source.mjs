// Video source by quality ladder (video-delivery R3, R4): with Media Source, play `hlsSrc` through hls.js; otherwise play the
// fixed-rung file. When the network speeds up, replace the already-buffered low-rung part ahead of the playhead.
const HLS_URL = "/assets/vendor/hls.light-1.7.3.min.js";
const players = new Map();
// undefined: not loaded yet; null: the browser has no Media Source or loading failed.
let hlsLibrary;
let library;

// Load the library on first need without blocking render (R3); the catalog calls it early, alongside the artifact load.
export const loadHls = () => library ??= new Promise((resolve) => {
  if (!self.MediaSource && !self.ManagedMediaSource) return resolve(hlsLibrary = null);
  const script = Object.assign(document.createElement("script"), { src: HLS_URL, async: true });
  script.onload = () => resolve(hlsLibrary = self.Hls?.isSupported() ? self.Hls : null);
  script.onerror = () => resolve(hlsLibrary = null);
  document.head.append(script);
});

// `nextAutoLevel` reruns the ABR algorithm on every read, so read it once, and only while there is still a part below the ceiling rung.
const behind = (video) => {
  if (video.paused) return false;
  const { hls, fragments } = players.get(video);
  const lowest = Math.min(...[...fragments.values()].map(({ level }) => level));
  return lowest < hls.maxAutoLevel && lowest < hls.nextAutoLevel;
};

// R4 ahead: remove the low-rung part from the keyframe (every 0.5 s) that the new rung can fetch before playback reaches it; bandwidth is split
// across the `share` videos switching together; hls.js refetches the removed part at the new rung by itself.
const replaceAhead = (video, share = 1) => {
  const { hls, fragments } = players.get(video);
  const level = hls.nextAutoLevel;
  const bps = hls.bandwidthEstimate / share;
  let flushed = false;
  for (const [sn, fragment] of fragments) {
    if (fragment.level >= level) continue;
    const fetch = (fragment.end - fragment.start) * hls.levels[level].bitrate / bps;
    const from = Math.max(fragment.start, Math.ceil((video.currentTime + 0.5 + 1.5 * fetch) * 2) / 2);
    if (from >= fragment.end) continue;
    fragments.delete(sn);
    flushed = true;
    hls.trigger(self.Hls.Events.BUFFER_FLUSHING, { startOffset: from, endOffset: fragment.end, type: null });
  }
  // A fully loaded clip means hls.js has stopped loading: restart it after the removal so it does not misread the old buffer still reaching the clip end.
  if (flushed && !hls.loadingEnabled) hls.once(self.Hls.Events.BUFFER_FLUSHED, () => hls.startLoad(video.currentTime, true));
};

export function releaseVideoSource(video) {
  const player = players.get(video);
  players.delete(video);
  player?.abort.abort();
  player?.hls.destroy();
  delete video.dataset.videoSource;
  video.removeAttribute("src");
  video.load();
}

// Attach the source to a video: a card caps at rung `capWidth` (R2), detail starts at the first playlist rung. Returns false when the video already has
// this source.
export function setVideoSource(video, item, { file, capWidth = Infinity }) {
  const key = item.hlsSrc || file;
  if (video.dataset.videoSource === key) return false;
  if (video.dataset.videoSource) releaseVideoSource(video);
  video.dataset.videoSource = key;
  if (!item.hlsSrc) {
    video.src = file;
    return true;
  }
  const attach = (Hls) => {
    if (video.dataset.videoSource !== key || players.has(video)) return;
    // Attaching a source reruns the load algorithm and so cancels a play() called while waiting for the library; call it again after attaching.
    const resume = !video.paused;
    if (!Hls) {
      video.src = file;
      if (resume) void video.play().catch(() => {});
      return;
    }
    const hls = new Hls({ autoStartLoad: false, loopBackBufferFlush: false });
    const abort = new AbortController();
    const fragments = new Map();
    const player = { hls, fragments, abort, parked: false };
    players.set(video, player);
    const card = Number.isFinite(capWidth);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const cap = hls.levels.findLastIndex(({ width }) => width <= capWidth);
      if (card) hls.autoLevelCapping = cap;
      hls.startLevel = card ? cap : hls.firstLevel;
      // The second handed from card to detail or back is assigned before the playlist arrives (media-card R6).
      hls.startLoad(video.currentTime || -1);
    });
    // Shared measurement (R4): once a clip is fully loaded hls.js stops measuring, so a video that just fetched a segment shares its measurement with the other videos.
    hls.on(Hls.Events.FRAG_BUFFERED, (_, { frag }) => {
      if (frag.type !== "main") return;
      fragments.set(frag.sn, { start: frag.start, end: frag.start + frag.duration, level: frag.level });
      const estimate = hls.bandwidthEstimate;
      players.forEach((player) => { if (player.hls.bandwidthEstimate < estimate) player.hls.bandwidthEstimate = estimate; });
      const due = [...players.keys()].filter(behind);
      due.forEach((entry) => replaceAhead(entry, due.length));
      // A paused card (not yet on screen or scrolled past) keeps what it loaded then stops; playing resumes loading: on slow 4G an off-screen card
      // loading the whole clip hogs bandwidth, so the first segment of a card that just appeared took 3.8 s (measured on cloud 2026-10-25).
      // Only re-enable a card paused by this rule: re-enabling while the replace-ahead rule is waiting for removal to finish would load twice and stall the video.
      if (card && video.paused) {
        hls.stopLoad();
        player.parked = true;
      }
    });
    video.addEventListener("playing", () => {
      if (!player.parked) return;
      player.parked = false;
      hls.startLoad(video.currentTime, true);
    }, { signal: abort.signal });
    // Once fully loaded, stop hls.js's 100 ms loop: every card in the render window kept an instance spinning idle even
    // after finishing (measured on cloud 2026-10-25, 52 cards: 200 ms of script per 20 s scroll); the replace-ahead rule re-enables it.
    hls.on(Hls.Events.BUFFERED_TO_END, () => hls.stopLoad());
    // On an unrecoverable error, fall back to the fixed-rung file; if that file also fails, the card and primary handle the video error as before.
    hls.on(Hls.Events.ERROR, (_, { fatal }) => {
      if (!fatal) return;
      // If playing (or waiting to play), keep playing from the file: detaching the player reruns the load algorithm so the video would stop.
      const resume = !video.paused;
      releaseVideoSource(video);
      video.dataset.videoSource = key;
      video.src = file;
      if (resume) void video.play().catch(() => {});
    });
    // Seek and loop back to second 0 rerun the ahead rule (R4).
    video.addEventListener("seeked", () => { if (behind(video)) replaceAhead(video); }, { signal: abort.signal });
    hls.attachMedia(video);
    hls.loadSource(item.hlsSrc);
    if (resume) void video.play().catch(() => {});
  };
  // If the library is already loaded, attach immediately so the caller's play() is not cancelled.
  if (hlsLibrary !== undefined) attach(hlsLibrary);
  else void loadHls().then(attach);
  return true;
}
