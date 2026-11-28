// Standalone lockup for places that load the logo as an image (Cloudflare Access login page): theme variables do not resolve in <img>, so bake in the brand colors.
// The mark plays the brand flip once on load (strips flip around the left-edge axis, cyan to black, black face to CMYK); CSS only, because scripts do not run in <img>.
const MARK_COLORS = {
  "logo-mark-black": "#2b2a29",
  "logo-mark-yellow": "#ffed00",
  "logo-mark-magenta": "#e5097f",
  "logo-mark-cyan": "#00a0e3",
};
const WORDMARK_COLOR = "#2f2f2f";
const STRIP_ORDER = ["logo-mark-cyan", "logo-mark-magenta", "logo-mark-yellow", "logo-mark-black"];
const FLIP = (n) => `rotate(-60deg) scaleY(${n}) rotate(60deg)`;
const ANIMATION_CSS = `<style>.o,.n{transform-box:fill-box;transform-origin:50% 50%;animation-fill-mode:both;animation-duration:.22s}.o{transform:${FLIP(0)};animation-name:away;animation-timing-function:cubic-bezier(.5,0,.75,0)}.n{animation-name:come;animation-timing-function:cubic-bezier(.25,1,.5,1)}.sh{opacity:0;animation:shade .22s cubic-bezier(.25,1,.5,1) both;animation-delay:inherit}@keyframes away{from{transform:${FLIP(1)}}to{transform:${FLIP(0)}}}@keyframes come{from{transform:${FLIP(0)}}to{transform:${FLIP(1)}}}@keyframes shade{from{opacity:.5}to{opacity:0}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;

export function accessLoginLogo(lockupSvg) {
  let svg = lockupSvg
    .replace(/<g id="truong-thinh-subtitle-en"[\s\S]*?<\/g>\s*/, "")
    .replace(/fill="currentColor"/, `fill="${WORDMARK_COLOR}"`);
  for (const [name, color] of Object.entries(MARK_COLORS)) svg = svg.replace(`var(--${name}, currentColor)`, color);
  if (/var\(|currentColor|display="none"/.test(svg)) throw new Error("Access login logo still depends on page styles.");
  return animateMark(svg);
}

function animateMark(svg) {
  let flipped = 0;
  const marked = svg.replace(/<path fill="(#[0-9a-f]{6})" (d="[^"]+") \/>/g, (_, color, d) => {
    const name = Object.keys(MARK_COLORS).find((key) => MARK_COLORS[key] === color);
    const rank = STRIP_ORDER.indexOf(name);
    if (rank < 0) throw new Error(`Unexpected mark color ${color}.`);
    flipped += 1;
    const away = (0.35 + rank * 0.08).toFixed(2);
    const come = (0.57 + rank * 0.08).toFixed(2);
    const face = (cls, fill) => `<path${cls} fill="${fill}" ${d}/>`;
    return `<g class="o" style="animation-delay:${away}s">${face("", MARK_COLORS["logo-mark-black"])}</g><g class="n" style="animation-delay:${come}s">${face("", color)}${face(' class="sh"', "#000")}</g>`;
  });
  if (flipped !== STRIP_ORDER.length) throw new Error("Access login logo expects four mark strips.");
  return marked.replace(/(<svg [^>]*>)/, `$1${ANIMATION_CSS}`);
}
