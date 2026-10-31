// Bốn màu nổi bật của ảnh cho Flow chờ ảnh primary (advertising-skeleton R3): k-means trên pixel RGB, tâm khởi đầu theo
// k-means++ với seed cố định nên chạy lại ra y hệt; trả về sắp từ sáng tới tối như preset.
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const distance = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

export function palette(pixels, k = 4, rounds = 12) {
  const points = [];
  for (let index = 0; index + 2 < pixels.length; index += 3) points.push([pixels[index], pixels[index + 1], pixels[index + 2]]);
  let seed = 1;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let centers = [points[Math.floor(random() * points.length)]];
  while (centers.length < k) {
    // Tâm mới bốc theo bình phương khoảng cách tới tâm gần nhất; ảnh ít màu hơn k thì lặp lại tâm cũ.
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
    // Cụm rỗng giữ tâm cũ.
    centers = centers.map((center, index) => (sums[index][3] ? sums[index].slice(0, 3).map((sum) => sum / sums[index][3]) : center));
  }
  return centers.map((center) => center.map(Math.round)).sort((a, b) => luma(b) - luma(a));
}
