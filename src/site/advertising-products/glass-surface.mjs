// Kính: một component glass dùng chung cho mọi glass surface (docs/specs/glass-surface.md).
// Các bước blur (increment trong detail.css), rồi tint trắng và grain. Surface mờ dần từng bước (spec R6)
// có năm bước (level 7.14, 16.07, 32.14, 57.14, 100px: trần 100px, owner 06/10); band của arc có ba
// (4.5, 12, 28px; owner, 05/10, cho A05s).
const STEPS = 5;
const ARC_STEPS = 3;
// Arc của owner (06/10): apex ở 35% cụm CTA, bán kính 3.5 viewport width, band 1.75 chiều cao cụm,
// trắng tinh từ 0.35 card width bên trong các góc batch, tint trắng 0.35 trên arc.
const ARC = Object.freeze({ centre: 0.35, radius: 3.5, band: 1.75, whiteRamp: 0.35, tint: 0.35 });
// Bên trong arc blur tiếp tục tăng từ 28px của band trên arc đến trần 100px trên vòng tròn trắng tinh,
// qua tối đa 5 inner step. Máy yếu bớt inner step rồi tới band step, có thể chỉ còn core 28px, để giữ
// TARGET_FPS khi arc đang trên màn hình (owner 06/10, band từ 10/10).
const ARC_LEVEL = 28;
const CEILING = 100;
const INNER_MAX = 5;
// Gate A05s trên 60fps (owner chọn 10/10, docs/decisions/a05s-frame-budget.md).
const TARGET_FPS = 60;
const FIT_MAX = INNER_MAX + ARC_STEPS;
const FIT_KEY = "glass-arc-steps";
// Phone chỉ vẽ core 28px, không đo: trên A05s đo lúc đang vuốt làm trượt gate, kết quả fit không ổn định
// và ba lớp blur vẫn dưới 60fps (owner chọn 10/10). Máy khác nhớ số step đã fit qua các lần tải trang,
// nên chỉ lần đầu phải trả các frame chậm lúc đo.
let fittedSteps = (() => {
  try {
    if (matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) return 0;
    const stored = localStorage.getItem(FIT_KEY);
    return stored === null ? undefined : Number(stored);
  } catch {
    return undefined;
  }
})();
const geometries = new WeakMap();
// Vị trí trong band (0 trên arc, 1 ở mép band) nơi mỗi step chạy từ bật hoàn toàn đến tắt; các step lân cận chồng lên nhau.
const RAMPS = Array.from({ length: ARC_STEPS }, (_, index) =>
  [Math.max(0, (ARC_STEPS - 1 - index) / ARC_STEPS - 0.1), Math.min(1, (ARC_STEPS - index) / ARC_STEPS + 0.1)]);
// Bên trong arc mọi band step bật hoàn toàn, nên một step đầy đủ (core) thay cho chúng ở đó và các step
// chỉ phủ band. Core bàn giao cho các step qua FADE px bên trong arc, nên không lộ đường nối: core
// vào dần ở nửa ngoài trong khi các step vẫn bật, các step ra dần ở nửa trong, nên trang gốc chưa blur
// không bao giờ lộ qua khe nơi cả hai đều chỉ một phần. Mỗi box
// vượt ra ngoài mask một sigma của blur (28px cho core): margin rộng hơn không đổi pixel nào quá 3/255,
// và mỗi hàng của box là thêm một hàng bị blur mỗi frame.
const FADE = 48;
const STEP_REACH = [5, 12, 26];
const CORE_REACH = 28;
const GRAIN_SIZE = 160;
// Mean trắng mà grain của arc thêm vào (opacity 0.12 x mean alpha 0.5, detail.css); tint mang ít đi đúng bằng đó.
const GRAIN_WHITE = 0.06;
let grain;
const waitingForGrain = [];

// Grain nằm trên từng Kính, không phải html, nên việc nó đến muộn chỉ restyle glass chứ không restyle cả trang.
const setGrain = (glass) => {
  glass.style.setProperty("--glass-grain", grain.grey);
  glass.style.setProperty("--glass-grain-white", grain.white);
  glass.style.setProperty("--glass-grain-size", `${GRAIN_SIZE / (window.devicePixelRatio || 1)}px`);
};

// Noise mono tĩnh, một texel mỗi device pixel: xám cho overlay (overlay giữ trắng tinh vẫn trắng), và
// cùng noise đó dạng white alpha cho arc (detail.css).
function makeGrain() {
  grain = "";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRAIN_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;
  const [grey, white] = [0, 1].map(() => context.createImageData(GRAIN_SIZE, GRAIN_SIZE));
  const [greyPixels, whitePixels] = [grey, white].map((image) => new Uint32Array(image.data.buffer));
  let state = 0x9e3779b9;
  for (let index = 0; index < greyPixels.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state >>> 24;
    greyPixels[index] = 0xff000000 | value * 0x10101;
    whitePixels[index] = (value << 24 | 0xffffff) >>> 0;
  }
  // toBlob copy bitmap khi được gọi, nên một canvas phục vụ cả hai.
  const url = (image) => new Promise((resolve) => {
    context.putImageData(image, 0, 0);
    canvas.toBlob((blob) => resolve(blob && `url(${URL.createObjectURL(blob)})`));
  });
  Promise.all([url(grey), url(white)]).then(([greyUrl, whiteUrl]) => {
    if (!greyUrl || !whiteUrl) return;
    grain = { grey: greyUrl, white: whiteUrl };
    waitingForGrain.splice(0).forEach(setGrain);
  });
}

// Surface tĩnh đều trông giống nhau qua một step đầy đủ hay năm step xếp chồng, với khoảng nửa chi phí;
// surface mờ vào/ra từng step (spec R6) cần cả năm.
export function createGlassSurface(shape, steps = shape === "arc" ? ARC_STEPS : 1) {
  if (grain === undefined) makeGrain();
  const glass = document.createElement("div");
  glass.className = "glass-surface";
  glass.dataset.glassShape = shape;
  glass.setAttribute("aria-hidden", "true");
  if (grain) setGrain(glass);
  else waitingForGrain.push(glass);
  const layers = steps === 1 ? ["glass-surface__step glass-surface__step--full"] : Array(steps).fill("glass-surface__step");
  // Core vẽ trước, nên các step blend lên nó và không bao giờ đưa nó blur lần hai. Inner step theo sau core;
  // band step ở cuối, nên rule nth-last-child của chúng trong detail.css vẫn đúng.
  if (shape === "arc") {
    layers.unshift("glass-surface__step glass-surface__step--full",
      ...Array(INNER_MAX).fill("glass-surface__step glass-surface__step--inner"));
    glass.dataset.glassSteps = String(fittedSteps ?? FIT_MAX);
  }
  glass.append(
    ...layers.map((className) => Object.assign(document.createElement("i"), { className })),
    Object.assign(document.createElement("i"), { className: "glass-surface__tint" }),
    Object.assign(document.createElement("i"), { className: "glass-surface__grain" }),
  );
  if (shape === "arc" && fittedSteps === undefined && typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      fitInnerSteps(glass);
    });
    // Box arc trải toàn bộ grid section, nên mép trên của nó vào viewport rất lâu trước arc; tint
    // bắt đầu từ mép band, nên nó đánh dấu lúc chính arc xuất hiện trên màn hình.
    observer.observe(glass.querySelector(".glass-surface__tint"));
  }
  return glass;
}

// Rate rAF trung vị qua tối đa `frames` frame hoặc 1.5s. Skeleton dưới arc animate mỗi frame, nên glass
// được recomposite mỗi frame và rate này là chi phí người xem cảm nhận.
const medianFps = (frames) => new Promise((resolve) => {
  const times = [];
  const tick = (now) => {
    times.push(now);
    if (times.length <= frames && now - times[0] < 1500) requestAnimationFrame(tick);
    else {
      const gaps = times.slice(1).map((time, index) => time - times[index]).sort((a, b) => a - b);
      resolve(1000 / gaps[gaps.length >> 1]);
    }
  };
  requestAnimationFrame(tick);
});

// Bắt đầu với mọi inner step và band step, bớt một khi rate còn dưới target (inner trước, rồi band từ
// step ngoài cùng); core luôn còn.
async function fitInnerSteps(glass) {
  let steps = FIT_MAX;
  for (;;) {
    await medianFps(10);
    if (steps === 0 || await medianFps(45) >= TARGET_FPS) break;
    steps -= 1;
    glass.dataset.glassSteps = String(steps);
    if (geometries.has(glass)) layoutArcGlass(glass, geometries.get(glass));
  }
  fittedSteps = steps;
  try {
    localStorage.setItem(FIT_KEY, String(steps));
  } catch {}
}

// CSS cubic-bezier(x1, y1, x2, y2) như hàm của thời gian; x đơn điệu, nên bisection tìm ra tham số.
const cubicBezier = (x1, y1, x2, y2) => {
  const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let low = 0;
    let high = 1;
    for (let pass = 0; pass < 24; pass += 1) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < x) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
};
// Reveal đã duyệt (design-system/components/Glass/README.md): vào trong 0.6s của 1.4s, ra trong phần còn lại.
const REVEAL_PEAK = 0.6 / 1.4;
const REVEAL_IN = cubicBezier(0, 0, 0.26, 1);
const REVEAL_OUT = cubicBezier(0.86, 0, 0.07, 1);
const REVEAL_SAMPLES = 28;

// Cường độ glass qua reveal, 0 đến 1 rồi về 0; t chạy qua toàn bộ reveal.
export function glassRevealLevel(t) {
  return t <= REVEAL_PEAK ? REVEAL_IN(t / REVEAL_PEAK) : 1 - REVEAL_OUT((t - REVEAL_PEAK) / (1 - REVEAL_PEAK));
}

const REVEAL_OFFSETS = Array.from({ length: REVEAL_SAMPLES + 1 }, (_, index) => index / REVEAL_SAMPLES);
const REVEAL_LEVELS = REVEAL_OFFSETS.map(glassRevealLevel);

// Spec R6: step vào từ nhẹ đến mạnh và ra từ mạnh đến nhẹ, chỉ bằng opacity; tint và grain theo
// level, nên glass bắt đầu và kết thúc không blur, không tint. Keyframe lấy mẫu giữ nó trên compositor.
export function playGlassReveal(glass, duration) {
  const layers = [...glass.children];
  // Đọc mọi base opacity trước animate đầu tiên, nên một reveal chỉ tốn một lần style recalc.
  const bases = layers.map((layer) => Number(getComputedStyle(layer).opacity));
  return layers.map((layer, index) => {
    const step = layer.classList.contains("glass-surface__step");
    return layer.animate(REVEAL_OFFSETS.map((offset, sample) => {
      const level = REVEAL_LEVELS[sample];
      return { offset, opacity: bases[index] * (step ? Math.min(1, Math.max(0, STEPS * level - index)) : level) };
    }), { duration, fill: "both" });
  });
}

// Vòng tròn arc theo tọa độ của glass box: apex yIn, bán kính R, band T, tâm (W / 2, cy),
// và dFull, vòng tròn qua hai góc đáy batch nơi màu trắng thành trắng tinh.
export function arcGlassGeometry({ width, batchBottom, realBottom, cardWidth, clusterTop, clusterBottom }) {
  const whiteRamp = ARC.whiteRamp * cardWidth;
  const clusterHeight = clusterBottom - clusterTop;
  const yIn = Math.min(clusterTop + ARC.centre * clusterHeight, batchBottom - 2 * whiteRamp);
  // Mép band không bao giờ nhô lên trên các photo thật.
  const band = Math.max(8, Math.min(ARC.band * clusterHeight, yIn - realBottom));
  const depth = batchBottom - yIn;
  // Bán kính nhỏ nhất giữ cả hai góc đáy whiteRamp bên trong arc, nên chúng vẫn trắng tinh.
  const minRadius = (depth * depth - whiteRamp * whiteRamp + width * width / 4) / (2 * (depth - whiteRamp));
  const radius = Math.max(ARC.radius * width, minRadius);
  const cy = yIn + radius;
  return { width, batchBottom, yIn, band, radius, cy, dFull: Math.hypot(width / 2, cy - batchBottom) };
}

const smooth = (x) => x * x * (3 - 2 * x);
const setMask = (node, value) => {
  node.style.setProperty("-webkit-mask-image", value);
  node.style.setProperty("mask-image", value);
};

export function layoutArcGlass(glass, geometry) {
  const { width, batchBottom, band, radius, cy, dFull } = geometry;
  geometries.set(glass, geometry);
  // Hai pixel chạy dưới footer để làm tròn subpixel không bao giờ lộ mép frame.
  const place = (node, top, bottom = batchBottom + 2) => Object.assign(node.style, { top: `${top}px`, height: `${bottom - top}px` });
  const circle = (top) => `circle at ${width / 2}px ${cy - top}px`;
  const core = radius - FADE;
  // Vòng fade trong thấp nhất ở hai bên box.
  const seam = cy - Math.sqrt(core * core - width * width / 4);
  const top = cy - radius - band;
  const [coreStep, ...rest] = glass.querySelectorAll(".glass-surface__step");
  const inner = rest.slice(0, INNER_MAX);
  const steps = rest.slice(INNER_MAX);
  const coreTop = Math.max(top, cy - radius - CORE_REACH);
  place(coreStep, coreTop);
  setMask(coreStep, `radial-gradient(${circle(coreTop)}, #000 ${radius - FADE / 2}px, transparent ${radius}px)`);
  const fit = Number(glass.dataset.glassSteps ?? FIT_MAX);
  steps.forEach((step, index) => {
    step.hidden = index < ARC_STEPS - Math.min(fit, ARC_STEPS);
    const outer = radius + RAMPS[index][1] * band;
    place(step, cy - outer, Math.min(batchBottom + 2, seam + STEP_REACH[index]));
    setMask(step, `radial-gradient(${circle(cy - outer)}, transparent ${core}px, #000 ${radius - FADE / 2}px, `
      + `#000 ${radius + RAMPS[index][0] * band}px, transparent ${outer}px)`);
  });
  // Inner step: level n trên N là ARC_LEVEL + (CEILING - ARC_LEVEL) n / N, mỗi step thêm increment cầu phương của nó và
  // vào dần trong phần của nó trên đường từ arc đến vòng tròn trắng tinh; các step lân cận chồng nhau như RAMPS.
  const count = Math.max(0, fit - ARC_STEPS);
  const span = Math.max(1, radius - dFull);
  const level = (n) => ARC_LEVEL + (CEILING - ARC_LEVEL) * n / count;
  inner.forEach((step, index) => {
    step.hidden = index >= count;
    if (step.hidden) return;
    const increment = Math.sqrt(level(index + 1) ** 2 - level(index) ** 2);
    const from = radius - span * Math.max(0, index / count - 0.1);
    const to = radius - span * Math.min(1, (index + 1) / count + 0.1);
    const stepTop = Math.max(top, cy - from - Math.ceil(increment));
    step.style.setProperty("--glass-step-blur", `${increment.toFixed(2)}px`);
    place(step, stepTop);
    setMask(step, `radial-gradient(${circle(stepTop)}, #000 ${to.toFixed(1)}px, transparent ${from.toFixed(1)}px)`);
  });
  // Trắng theo cùng các vòng tròn: tinh từ vòng góc, tint trên arc, không có ở mép band.
  // Grain (mask m bên dưới) thêm trung bình GRAIN_WHITE * m, nên tint giữ lại phần đó.
  const white = (alpha, m) => Math.max(0, (alpha - GRAIN_WHITE * m) / (1 - GRAIN_WHITE * m)).toFixed(4);
  const stops = [];
  for (let index = 0; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${white(ARC.tint + (1 - ARC.tint) * smooth(1 - x), Math.min(1, 2 * x))}) ${(dFull + (radius - dFull) * x).toFixed(1)}px`);
  }
  for (let index = 1; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${white(ARC.tint * smooth(1 - x), 1 - x)}) ${(radius + band * x).toFixed(1)}px`);
  }
  const tint = glass.querySelector(".glass-surface__tint");
  place(tint, top);
  tint.style.background = `radial-gradient(${circle(top)}, #fff ${dFull.toFixed(1)}px, ${stops.join(", ")})`;
  const grain = glass.querySelector(".glass-surface__grain");
  place(grain, top);
  // Grain mờ dần về phía vòng tròn trắng tinh, nên trắng tinh không có grain.
  setMask(grain, `radial-gradient(${circle(top)}, transparent ${dFull.toFixed(1)}px, #000 ${((dFull + radius) / 2).toFixed(1)}px, `
    + `#000 ${radius}px, transparent ${radius + band}px)`);
}

// Phone (owner 10/10): thay mọi step backdrop-filter của arc bằng một ảnh nhòe dựng sẵn. Dưới cung chỉ có
// skeleton card (R2), nên runtime vẽ chúng một lần vào canvas nhỏ, blur sẵn từng level của arc (band 0 đến 28px,
// trong cung tới 100px, màu cộng dồn như các step) rồi crossfade các level theo khoảng cách tới tâm cung.
// Màn hình chỉ composite một ảnh tĩnh mỗi frame, không blur lại.
const BAKE_SCALE = 0.5;
const BLUR_PX = 3;
const ARC_SATURATE = 1.55;
const ARC_BRIGHTNESS = 1.05;
const BAKE_LEVELS = [4.5, 12, 28, 42.4, 56.8, 71.2, 85.6, 100];

// cards: [{ left, top, width, height, color, image }] theo tọa độ glass box; image đã decode.
export function bakeArcGlass(glass, cards, paper) {
  const geometry = geometries.get(glass);
  if (!geometry) return;
  const { width, batchBottom, band, radius, cy, dFull } = geometry;
  const top = cy - radius - band;
  const height = batchBottom + 2 - top;
  const canvas = () => Object.assign(document.createElement("canvas"),
    { width: Math.ceil(width * BAKE_SCALE), height: Math.ceil(height * BAKE_SCALE) });
  const source = canvas();
  const context = source.getContext("2d");
  context.scale(BAKE_SCALE, BAKE_SCALE);
  context.translate(0, -top);
  context.fillStyle = paper;
  context.fillRect(0, top, width, height);
  for (const card of cards) {
    context.fillStyle = card.color;
    context.fillRect(card.left, card.top, card.width, card.height);
    // Canvas flow tràn 8% mỗi bên của surface (detail.css), nên card chỉ hiện phần giữa của ảnh tĩnh.
    const { naturalWidth: w, naturalHeight: h } = card.image;
    context.drawImage(card.image, w * 0.08 / 1.16, h * 0.08 / 1.16, w / 1.16, h / 1.16,
      card.left, card.top, card.width, card.height);
  }
  // Level theo khoảng cách d tới tâm: tăng tuyến tính 0 đến 28px qua band, 28 đến 100px từ cung tới vòng trắng tinh.
  const distanceAt = (level) => level <= ARC_LEVEL ? radius + band * (1 - level / ARC_LEVEL)
    : radius - Math.max(1, radius - dFull) * (level - ARC_LEVEL) / (CEILING - ARC_LEVEL);
  const baked = canvas();
  const output = baked.getContext("2d");
  const layer = canvas();
  const layerContext = layer.getContext("2d");
  const [x, y] = [width / 2 * BAKE_SCALE, (cy - top) * BAKE_SCALE];
  const small = document.createElement("canvas");
  const smallContext = small.getContext("2d");
  BAKE_LEVELS.forEach((level, index) => {
    // Band step k nhân saturate/brightness lên căn bậc ba của tổng arc; core và inner giữ tổng.
    const k = Math.min(3, index + 1) / 3;
    // Blur ở độ phân giải giảm theo level (sigma khoảng 3px) rồi phóng lại: blur canvas trên CPU tốn theo
    // sigma nhân diện tích, nên level 100px chỉ là ảnh vài chục pixel.
    const scale = Math.min(1, BLUR_PX / (level * BAKE_SCALE));
    small.width = Math.ceil(source.width * scale);
    small.height = Math.ceil(source.height * scale);
    smallContext.filter = `blur(${level * BAKE_SCALE * scale}px) saturate(${ARC_SATURATE ** k}) brightness(${ARC_BRIGHTNESS ** k})`;
    smallContext.drawImage(source, 0, 0, small.width, small.height);
    layerContext.globalCompositeOperation = "copy";
    layerContext.drawImage(small, 0, 0, layer.width, layer.height);
    // Mask level: 0 nơi arc đạt level trước, 1 từ nơi nó đạt level này vào trong; lớp sau phủ lên lớp trước.
    const outer = distanceAt(index ? BAKE_LEVELS[index - 1] : 0) * BAKE_SCALE;
    const inner = distanceAt(level) * BAKE_SCALE;
    const mask = layerContext.createRadialGradient(x, y, 0, x, y, outer);
    mask.addColorStop(inner / outer, "#000");
    mask.addColorStop(1, "transparent");
    layerContext.globalCompositeOperation = "destination-in";
    layerContext.fillStyle = mask;
    layerContext.fillRect(0, 0, layer.width, layer.height);
    output.drawImage(layer, 0, 0);
  });
  // Gắn chính canvas: toDataURL ép readback và PNG encode (hơn 0.5s khi CPU chậm 4 lần).
  baked.className = "glass-surface__baked";
  Object.assign(baked.style, { top: `${top}px`, height: `${height}px` });
  glass.querySelector(".glass-surface__baked")?.remove();
  glass.prepend(baked);
  glass.dataset.glassBaked = "true";
}

export function clearArcGlassBake(glass) {
  glass.querySelector(".glass-surface__baked")?.remove();
  delete glass.dataset.glassBaked;
}
