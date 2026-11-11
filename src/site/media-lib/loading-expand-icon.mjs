// Expand icon that doubles as a loading spinner (owner 2026-11-11, advertising-detail R9): while loading it is a
// two-arc spinner; once ready the spin brakes until the arcs sit on the top-right and bottom-left corners, then each
// arc unbends point by point into one arrow of the expand icon.
const POINTS = 48;
const RADIUS = 8;
const ARC_DEGREES = 100;
const SPIN_MS = 700;
const SPEED = 360 / SPIN_MS;
// Braking covers the last quarter turn with a quadratic ease-out, so it starts at spin speed.
const BRAKE_DEGREES = 90;
const BRAKE_MS = 2 * BRAKE_DEGREES / SPEED;
const BEND_MS = 380;

// Points spaced evenly by length along a polyline.
const resample = (points) => {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return Array.from({ length: POINTS }, (_, k) => {
    const at = lengths.at(-1) * k / (POINTS - 1);
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < at) i += 1;
    const t = (at - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
    return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t];
  });
};
// Arc centred on `middle` degrees (screen angles, y down) in the 24-unit icon box.
const arc = (middle) => Array.from({ length: POINTS }, (_, k) => {
  const angle = (middle - ARC_DEGREES / 2 + ARC_DEGREES * k / (POINTS - 1)) * Math.PI / 180;
  return [12 + RADIUS * Math.cos(angle), 12 + RADIUS * Math.sin(angle)];
});
// Each arrow is one stroke: corner start, corner, diagonal in and back out, corner end. The arc ends land on the
// corner ends and the arc middle on the diagonal's inner point.
const SHAPES = [
  [arc(-45), resample([[15, 3], [21, 3], [14, 10], [21, 3], [21, 9]])],
  [arc(135), resample([[9, 21], [3, 21], [10, 14], [3, 21], [3, 15]])],
];
const pathAt = ([from, to], t) => `M${from.map(([x, y], i) => `${(x + (to[i][0] - x) * t).toFixed(2)} ${(y + (to[i][1] - y) * t).toFixed(2)}`).join("L")}`;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// `group`: an SVG <g> with two <path> children in a 24x24 viewBox.
// `still()`: true when the icon must not move (reduced motion, or the control is not shown).
export function createLoadingExpandIcon(group, { still = () => false } = {}) {
  const paths = [...group.querySelectorAll("path")];
  group.style.transformOrigin = "12px 12px";
  group.style.transformBox = "view-box";
  let spin = null;
  let frame = 0;
  let loading = false;
  const draw = (t, angle = 0) => {
    paths.forEach((path, index) => path.setAttribute("d", pathAt(SHAPES[index], t)));
    group.style.transform = angle ? `rotate(${angle}deg)` : "";
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    spin?.cancel();
    spin = null;
  };
  draw(1);
  return {
    setLoading(next) {
      if (next === loading) return;
      loading = next;
      if (loading) {
        stop();
        draw(0);
        if (!still()) {
          spin = group.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
            { duration: SPIN_MS, iterations: Infinity, easing: "linear" });
        }
        return;
      }
      if (!spin || still()) {
        stop();
        draw(1);
        return;
      }
      // Any half turn works as the stop: the two arcs swap places, same picture.
      const from = (spin.currentTime % SPIN_MS) / SPIN_MS * 360;
      const to = Math.ceil((from + BRAKE_DEGREES) / 180) * 180;
      const cruiseMs = (to - BRAKE_DEGREES - from) / SPEED;
      const bendDelay = cruiseMs + BRAKE_MS * 0.35;
      const totalMs = Math.max(cruiseMs + BRAKE_MS, bendDelay + BEND_MS);
      stop();
      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        if (elapsed >= totalMs) {
          draw(1);
          return;
        }
        const brake = clamp01((elapsed - cruiseMs) / BRAKE_MS);
        const angle = elapsed < cruiseMs ? from + SPEED * elapsed : to - BRAKE_DEGREES + BRAKE_DEGREES * (1 - (1 - brake) ** 2);
        draw(easeInOut(clamp01((elapsed - bendDelay) / BEND_MS)), angle % 360);
        frame = requestAnimationFrame(tick);
      };
      draw(0, from);
      frame = requestAnimationFrame(tick);
    },
    cleanup: stop,
  };
}
