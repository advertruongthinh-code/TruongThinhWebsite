// Đường đi của card khi chuyển vị trí, không đi qua hộp primary (advertising-related-cta-motion R3).
// Tọa độ là góc trên trái trong related grid; primary chiếm [0, zone.width] x [0, zone.height].

// Đoạn a -> b có đi vào hộp mở (minX, maxX) x (minY, maxY) không; chạm mép không tính (slab test).
export function segmentCrossesBox(a, b, box) {
  let enter = 0;
  let exit = 1;
  for (const [start, delta, min, max] of [[a.x, b.x - a.x, box.minX, box.maxX], [a.y, b.y - a.y, box.minY, box.maxY]]) {
    if (delta === 0) {
      if (start <= min || start >= max) return false;
      continue;
    }
    let t0 = (min - start) / delta;
    let t1 = (max - start) / delta;
    if (t0 > t1) [t0, t1] = [t1, t0];
    enter = Math.max(enter, t0);
    exit = Math.min(exit, t1);
    if (enter >= exit) return false;
  }
  return true;
}

// null: đi thẳng. Ngược lại đi qua góc vuông `corner`; `cornerOffset` là tỷ lệ quãng đường tới góc (0..1).
export function planDetourPath({ from, to, size, zone }) {
  if (!zone) return null;
  const box = { minX: -size.width, maxX: zone.width, minY: -size.height, maxY: zone.height };
  if (!segmentCrossesBox(from, to, box)) return null;
  // Bên cạnh primary: x >= pw; phía dưới: y >= ph. Chỉ một điểm mỗi loại thì đường thẳng mới có thể cắt.
  const beside = [from, to].find((point) => point.x >= zone.width);
  const below = [from, to].find((point) => point !== beside && point.y >= zone.height);
  if (!beside || !below) return null;
  const corner = { x: beside.x, y: below.y };
  const first = Math.hypot(corner.x - from.x, corner.y - from.y);
  const second = Math.hypot(to.x - corner.x, to.y - corner.y);
  return { corner, cornerOffset: first + second > 0 ? first / (first + second) : 0 };
}
