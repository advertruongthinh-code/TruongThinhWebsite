// Four prominent image colors for the Flow waiting on the primary image (advertising-skeleton R3): k-means on RGB pixels, initial centers by
// k-means++ with a fixed seed so reruns give identical output; returned sorted light to dark like the preset.
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const distance = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

export function palette(pixels, k = 4, rounds = 12) {
  const points = [];
  for (let index = 0; index + 2 < pixels.length; index += 3) points.push([pixels[index], pixels[index + 1], pixels[index + 2]]);
  let seed = 1;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let centers = [points[Math.floor(random() * points.length)]];
  while (centers.length < k) {
    // New center is drawn by squared distance to the nearest center; an image with fewer colors than k repeats old centers.
    const weights = points.map((point) => Math.min(...centers.map((center) => distance(point, center))));
    let target = random() * weights.reduce((sum, weight) => sum + weight, 0);
    centers.push(target > 0 ? points.find((_, index) => (target -= weights[index]) <= 0) ?? points.at(-1) : centers[0]);
  }
  for (let round = 0; round < rounds; round += 1) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const point of points) {
      let best = 0;
      centers.forEach((center, index) => { if (distance(point, center) < distance(point, centers[best])) best = index; });
      sums[best].forEach((_, channel) => { sums[best][channel] += channel < 3 ? point[channel] : 1; });
    }
    // An empty cluster keeps its old center.
    centers = centers.map((center, index) => (sums[index][3] ? sums[index].slice(0, 3).map((sum) => sum / sums[index][3]) : center));
  }
  return centers.map((center) => center.map(Math.round)).sort((a, b) => luma(b) - luma(a));
}

// Bin of one 8-bit channel value in libvips hist_find_ndim (16 bins, what sharp stats().dominant reads): 0..16 -> 0, 17..32 -> 1, ..., 241..255 -> 15.
const bin = (value) => (value ? (value - 1) >> 4 : 0);

// Dominant color = center of the fullest bin of the 16x16x16 RGB histogram; same result as sharp stats().dominant on the same pixels.
// A tie keeps the first bin in libvips scan order (green, red, blue), checked against sharp in tests/site/media-colors.test.mjs.
export function dominant(pixels, channels = 3) {
  const counts = new Uint32Array(4096);
  for (let index = 0; index + 2 < pixels.length; index += channels) counts[bin(pixels[index]) * 256 + bin(pixels[index + 1]) * 16 + bin(pixels[index + 2])] += 1;
  let best = 0;
  for (let g = 0; g < 16; g += 1) for (let r = 0; r < 16; r += 1) for (let b = 0; b < 16; b += 1) {
    if (counts[r * 256 + g * 16 + b] > counts[best]) best = r * 256 + g * 16 + b;
  }
  return [best >> 8, (best >> 4) & 15, best & 15].map((index) => index * 16 + 8);
}

const hex = ([r, g, b]) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

// Relative luminance (WCAG, 0-100) of the area under a card's pill row (media-card R2, owner 2026-11-13): the bottom 15% of the 64px thumbnail,
// across the middle 40% of its width, where the dots or the counter sit.
const linear = (value) => (value /= 255) <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
export function pillLuminance(thumb, channels = 3, width = 64) {
  const height = Math.round(thumb.length / channels / width);
  let sum = 0;
  let count = 0;
  for (let y = Math.floor(height * 0.85); y < height; y += 1) {
    for (let x = Math.floor(width * 0.3); x < Math.ceil(width * 0.7); x += 1) {
      const at = (y * width + x) * channels;
      sum += 0.2126 * linear(thumb[at]) + 0.7152 * linear(thumb[at + 1]) + 0.0722 * linear(thumb[at + 2]);
      count += 1;
    }
  }
  return Math.round((sum / count) * 100);
}

// MEDIA_COLORS entry [dominant, 4 Flow colors, pill luminance]: colors as hex, no sharp or Node API so the CMS admin can import this file. Input is the stored WebP (never the PNG or JXL): `full` = pixels of the full-size image, `thumb` = pixels of the same image resized to
// 64px wide (sharp resize(64), lanczos3). Both are 8-bit sRGB, `channels` 3 (RGB) or 4 (RGBA, canvas getImageData; alpha ignored like removeAlpha()).
export function mediaColors({ full, thumb, channels = 3 }) {
  const rgb = channels === 3 ? thumb : thumb.filter((_, index) => index % 4 !== 3);
  return [...[dominant(full, channels), ...palette(rgb)].map(hex), pillLuminance(thumb, channels)];
}
