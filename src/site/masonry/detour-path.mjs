// Path of a card when it changes position, avoiding the primary box (advertising-cta-center-parallax R10).
// Coordinates are the top-left corner in the related grid; the primary occupies [0, zone.width] x [0, zone.height].

// Whether segment a -> b enters the open box (minX, maxX) x (minY, maxY); touching an edge does not count (slab test).
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

// null: go straight. Otherwise go through the right-angle `corner`; `cornerOffset` is the fraction of the distance to the corner (0..1).
// `origin`: top-left of the forbidden zone when it is not at the coordinate origin (suggestion pinned below the primary, advertising-detail R5).
export function planDetourPath({ from, to, size, zone, origin }) {
  if (!zone) return null;
  if (origin && (origin.x || origin.y)) {
    const shift = (point, sign) => ({ x: point.x + sign * origin.x, y: point.y + sign * origin.y });
    const plan = planDetourPath({ from: shift(from, -1), to: shift(to, -1), size, zone });
    return plan && { ...plan, corner: shift(plan.corner, 1) };
  }
  const box = { minX: -size.width, maxX: zone.width, minY: -size.height, maxY: zone.height };
  if (!segmentCrossesBox(from, to, box)) return null;
  // Beside the primary: x >= pw; below: y >= ph. Only with one point of each kind can a straight line cross.
  // Assumption: related coordinates are non-negative and the runtime has already moved the start point out of Z, so when crossing Z one end is always
  // beside and the other below. If either is missing (start point inside Z) return null and the card goes straight.
  const beside = [from, to].find((point) => point.x >= zone.width);
  const below = [from, to].find((point) => point !== beside && point.y >= zone.height);
  if (!beside || !below) return null;
  const corner = { x: beside.x, y: below.y };
  const first = Math.hypot(corner.x - from.x, corner.y - from.y);
  const second = Math.hypot(to.x - corner.x, to.y - corner.y);
  return { corner, cornerOffset: first + second > 0 ? first / (first + second) : 0 };
}

// Pinned items (primary, suggestion pinned below the primary) are the shared forbidden zone of related cards and the CTA batch frame
// (masonry-reuse step 6): a list of boxes `{ x, y, width, height }` in the same coordinate system as `from`, `to`, ordered from top
// to bottom (shifted in one pass in order, so a lower box never pushes the point back up into an upper box).
// A start point inside a box's zone is shifted to just below that box (a resize growing the primary overlaps the old spot); a straight
// line crossing a box goes around the first box it crosses, in list order.
export function planAroundPinned({ from, to, size, pinned = [], gap = 0 }) {
  let start = from;
  for (const box of pinned) {
    if (start.x > box.x - size.width && start.x < box.x + box.width
      && start.y > box.y - size.height && start.y < box.y + box.height) {
      start = { ...start, y: box.y + box.height + gap };
    }
  }
  for (const box of pinned) {
    const plan = planDetourPath({ from: start, to, size, zone: { width: box.width, height: box.height }, origin: box });
    if (plan) return { from: start, plan };
  }
  return { from: start, plan: null };
}
