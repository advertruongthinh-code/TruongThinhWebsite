// Nguồn video theo thang chất lượng (video-delivery R3, R4): có Media Source thì phát `hlsSrc` bằng hls.js, còn lại phát
// file bậc cố định. Mạng nhanh lên thì thay phần bậc thấp đã tải phía trước vị trí phát.
const HLS_URL = "/assets/vendor/hls.light-1.7.3.min.js";
const players = new Map();
// undefined: chưa nạp; null: trình duyệt không có Media Source hoặc nạp lỗi.
let hlsLibrary;
let library;

// Chỉ nạp thư viện khi trang có video mang hlsSrc; không chặn render (R3).
const loadHls = () => library ??= new Promise((resolve) => {
  if (!self.MediaSource && !self.ManagedMediaSource) return resolve(hlsLibrary = null);
  const script = Object.assign(document.createElement("script"), { src: HLS_URL, async: true });
  script.onload = () => resolve(hlsLibrary = self.Hls?.isSupported() ? self.Hls : null);
  script.onerror = () => resolve(hlsLibrary = null);
  document.head.append(script);
});

const behind = (video) => {
  const { hls, fragments } = players.get(video);
  return !video.paused && [...fragments.values()].some(({ level }) => level < hls.nextAutoLevel);
};

// R4 phía trước: xóa phần bậc thấp kể từ keyframe (mỗi 0,5 s) mà bậc mới kịp tải trước khi phát tới, băng thông chia
// cho `share` video cùng thay; hls.js tự tải lại phần đã xóa ở bậc mới.
const replaceAhead = (video, share = 1) => {
  const { hls, fragments } = players.get(video);
  const level = hls.nextAutoLevel;
  const bps = hls.bandwidthEstimate / share;
  for (const [sn, fragment] of fragments) {
    if (fragment.level >= level) continue;
    const fetch = (fragment.end - fragment.start) * hls.levels[level].bitrate / bps;
    const from = Math.max(fragment.start, Math.ceil((video.currentTime + 0.5 + 1.5 * fetch) * 2) / 2);
    if (from >= fragment.end) continue;
    fragments.delete(sn);
    hls.trigger(self.Hls.Events.BUFFER_FLUSHING, { startOffset: from, endOffset: fragment.end, type: null });
  }
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

// Gắn nguồn cho video: card chặn ở bậc `capWidth` (R2), detail bắt đầu ở bậc đầu playlist. Trả false khi video đã đúng
// nguồn này.
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
    // Gắn nguồn chạy lại thuật toán load nên hủy lệnh play() gọi trong lúc chờ thư viện; gọi lại sau khi gắn.
    const resume = !video.paused;
    if (!Hls) {
      video.src = file;
      if (resume) void video.play().catch(() => {});
      return;
    }
    const hls = new Hls({ autoStartLoad: false, loopBackBufferFlush: false });
    const abort = new AbortController();
    const fragments = new Map();
    players.set(video, { hls, fragments, abort });
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const cap = hls.levels.findLastIndex(({ width }) => width <= capWidth);
      if (Number.isFinite(capWidth)) hls.autoLevelCapping = cap;
      hls.startLevel = Number.isFinite(capWidth) ? cap : hls.firstLevel;
      // Giây giao từ card sang detail hoặc ngược lại được gán trước khi playlist về (media-card R6).
      hls.startLoad(video.currentTime || -1);
    });
    // Số đo chung (R4): clip tải hết thì hls.js ngừng đo, nên video vừa tải segment chia số đo cho video khác.
    hls.on(Hls.Events.FRAG_BUFFERED, (_, { frag }) => {
      if (frag.type !== "main") return;
      fragments.set(frag.sn, { start: frag.start, end: frag.start + frag.duration, level: frag.level });
      const estimate = hls.bandwidthEstimate;
      players.forEach((player) => { if (player.hls.bandwidthEstimate < estimate) player.hls.bandwidthEstimate = estimate; });
      const due = [...players.keys()].filter(behind);
      due.forEach((entry) => replaceAhead(entry, due.length));
    });
    // Lỗi không phục hồi được thì về file bậc cố định; file đó lỗi nữa thì card, primary xử lý lỗi video như cũ.
    hls.on(Hls.Events.ERROR, (_, { fatal }) => {
      if (!fatal) return;
      releaseVideoSource(video);
      video.dataset.videoSource = key;
      video.src = file;
    });
    // Tua và lặp về giây 0 chạy lại luật phía trước (R4).
    video.addEventListener("seeked", () => { if (behind(video)) replaceAhead(video); }, { signal: abort.signal });
    hls.attachMedia(video);
    hls.loadSource(item.hlsSrc);
    if (resume) void video.play().catch(() => {});
  };
  // Thư viện đã nạp thì gắn ngay để play() của nơi gọi không bị hủy.
  if (hlsLibrary !== undefined) attach(hlsLibrary);
  else void loadHls().then(attach);
  return true;
}
