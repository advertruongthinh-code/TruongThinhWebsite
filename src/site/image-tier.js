// Ảnh thích ứng mạng (docs/specs/image-adaptive-delivery.md): đo tốc độ từ Resource Timing của ảnh nội dung (R2),
// nâng ảnh bậc nhẹ lên bậc thường khi mạng nhanh lại (R4). Script đầu <head> đặt trạng thái ban đầu và chọn bậc (R3).
(() => {
  const root = document.documentElement;
  const SLOW_BPS = 2e6;
  const FAST_BPS = 4e6;
  const WINDOW = 4;
  const WINDOW_MS = 3000;
  const PROBE_MS = 3000;
  const MAX_ACTIVE = 2;
  if (navigator.connection?.saveData || typeof PerformanceObserver !== "function") return;

  const recent = [];
  const queued = new Set();
  const retries = new WeakMap();
  let fastStreak = 0;
  let active = 0;
  let lastMeasure = performance.now();
  let probeWaiting = false;

  const setTier = (tier) => {
    if (root.dataset.networkTier === tier) return;
    root.dataset.networkTier = tier;
    try { sessionStorage.setItem("tt-network-tier", tier); } catch {}
    if (tier === "normal") document.querySelectorAll("img[data-image-tier]").forEach((image) => near.observe(image));
    else document.querySelectorAll('img[sizes$="px"], img[data-sizes$="px"]').forEach(lighten);
  };

  // Mới sang slow: ảnh đã có sizes bậc thường nhưng chưa gửi request (lazy ngoài vùng tải, currentSrc rỗng) đổi sang bậc nhẹ.
  const lighten = (image) => {
    if (image.currentSrc || image.dataset.imageTier) return;
    const sizes = image.dataset.sizes || image.getAttribute("sizes");
    const half = `${Math.min(Math.ceil(Number.parseFloat(sizes) / 2), Math.floor(960 / devicePixelRatio))}px`;
    [image, image.previousElementSibling?.tagName === "SOURCE" && image.previousElementSibling].forEach((node) => {
      if (!node) return;
      if (node.hasAttribute("sizes")) node.setAttribute("sizes", half);
      if (node.dataset.sizes) node.dataset.sizes = half;
    });
    Object.assign(image.dataset, { imageTier: "low", imageTierSizes: sizes });
  };

  // Byte chia hợp các khoảng responseStart..responseEnd: ảnh tải song song trên HTTP/2 chia nhau băng thông,
  // chia riêng từng file sẽ ra tốc độ thấp hơn thật.
  const bitsPerSecond = (entries) => {
    let time = 0;
    let end = -Infinity;
    [...entries].sort((a, b) => a.responseStart - b.responseStart).forEach(({ responseStart, responseEnd }) => {
      if (responseEnd <= end) return;
      time += responseEnd - Math.max(responseStart, end);
      end = responseEnd;
    });
    return time > 0 ? entries.reduce((bytes, entry) => bytes + entry.transferSize, 0) * 8000 / time : 0;
  };

  const measure = (entry) => {
    if (!(entry.transferSize > 0) || !new URL(entry.name).pathname.startsWith("/assets/content/")) return;
    // Cửa sổ là tối đa 4 ảnh xong trong 3 s gần nhất: mạng vừa đổi thì số đo theo mạng mới, không bị ảnh cũ kéo lại.
    recent.push(entry);
    while (recent.length > WINDOW || recent[0].responseEnd < entry.responseEnd - WINDOW_MS) recent.shift();
    lastMeasure = performance.now();
    const speed = bitsPerSecond(recent);
    if (speed < SLOW_BPS) {
      fastStreak = 0;
      setTier("slow");
    } else if (speed >= FAST_BPS) {
      fastStreak += 1;
      if (fastStreak >= 2) setTier("normal");
      // Lần đo nhanh đầu khi đang slow: nâng thử thêm một ảnh để có lần đo thứ hai ngay.
      else if (root.dataset.networkTier === "slow") setTimeout(probe, 0, true);
    } else {
      fastStreak = 0;
    }
  };

  // Gần tâm viewport thì nâng trước (R4).
  const distance = (image) => {
    const { top, bottom } = image.getBoundingClientRect();
    return Math.abs((top + bottom) / 2 - innerHeight / 2);
  };

  // Bản tải tách rời DOM cùng srcset và sizes bậc thường, nên trình duyệt chọn đúng file mà ảnh thật sẽ chọn sau đó.
  const detachedCopy = (image, sizes) => {
    const picture = image.parentElement?.tagName === "PICTURE" ? image.parentElement.cloneNode(true) : null;
    const copy = picture ? picture.querySelector("img") : image.cloneNode();
    [copy, picture && copy.previousElementSibling].forEach((node) => {
      if (!node) return;
      node.removeAttribute("loading");
      if (node.hasAttribute("data-srcset")) node.setAttribute("srcset", node.getAttribute("data-srcset"));
      if (sizes) node.setAttribute("sizes", sizes);
    });
    copy.fetchPriority = "low";
    return copy;
  };

  const upgrade = async (image, force = false) => {
    queued.delete(image);
    near.unobserve(image);
    if ((!force && root.dataset.networkTier !== "normal") || !image.isConnected || !image.dataset.imageTier) return;
    active += 1;
    // Nơi chọn bậc ghi sẵn giá trị bậc thường: sizes với ảnh có srcset, src với ảnh không srcset (primary Advertising).
    // sizes "auto" không dùng được cho bản tách rời: đổi sang bề rộng hiển thị đo được cho cả hai bản.
    const { imageTierSrc: src, imageTierSizes: normalSizes } = image.dataset;
    const sizes = normalSizes?.startsWith("auto") ? `${Math.ceil(image.getBoundingClientRect().width)}px` : normalSizes;
    const copy = src ? Object.assign(new Image(), { src, fetchPriority: "low" }) : detachedCopy(image, sizes);
    try {
      await copy.decode();
      if (src) image.src = src;
      else [image, image.previousElementSibling?.tagName === "SOURCE" && image.previousElementSibling].forEach((node) => {
        if (!node) return;
        node.setAttribute("sizes", sizes);
        if (node.dataset.sizes) node.dataset.sizes = sizes;
      });
      ["imageTier", "imageTierSrc", "imageTierSizes"].forEach((key) => delete image.dataset[key]);
    } catch {
      // Lỗi thì giữ bậc nhẹ, không gắn is-media-error; thử lại một lần ở lần về normal kế tiếp.
      const count = (retries.get(image) || 0) + 1;
      retries.set(image, count);
      if (count > 1) delete image.dataset.imageTier;
    } finally {
      active -= 1;
      if (probeWaiting) probe();
      next();
    }
  };

  const next = () => {
    while (active < MAX_ACTIVE && queued.size && root.dataset.networkTier === "normal") {
      upgrade([...queued].sort((a, b) => distance(a) - distance(b))[0]);
    }
  };

  // Ảnh trong viewport và một viewport quanh đó vào hàng đợi; ảnh xa hơn vào khi tới gần.
  const near = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => (isIntersecting ? queued.add(target) : queued.delete(target)));
    next();
  }, { rootMargin: "100% 0px" });

  // Ở slow, trang đứng yên thì không có ảnh mới để đo; nâng thử một ảnh đang hiện, lần tải đó vừa là việc nâng vừa là một
  // lần đo (R4).
  // confirm: lần đo nhanh đầu cần lần thứ hai; đang có ảnh tải thì chờ nó xong rồi thử.
  const probe = (confirm = probeWaiting) => {
    probeWaiting = false;
    if (root.dataset.networkTier !== "slow" || document.hidden) return;
    if (active) {
      probeWaiting = confirm;
      return;
    }
    lastMeasure = performance.now();
    const visible = [...document.querySelectorAll("img[data-image-tier]")]
      .filter((image) => image.complete && image.naturalWidth && distance(image) < innerHeight);
    if (visible.length) upgrade(visible.sort((a, b) => distance(a) - distance(b))[0], true);
  };
  setInterval(() => performance.now() - lastMeasure >= PROBE_MS && probe(false), 1000);

  // Chromium báo đổi mạng: chậm hẳn thì sang slow ngay, nhanh lên thì nâng thử một ảnh để đo lại.
  navigator.connection?.addEventListener?.("change", () => (navigator.connection.downlink < 2 ? setTier("slow") : probe(true)));
  new PerformanceObserver((list) => list.getEntries().forEach(measure)).observe({ type: "resource", buffered: true });
  if (root.dataset.networkTier === "normal") document.querySelectorAll("img[data-image-tier]").forEach((image) => near.observe(image));
})();
