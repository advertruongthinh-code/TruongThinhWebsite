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
