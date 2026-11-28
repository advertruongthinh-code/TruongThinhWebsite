// Standalone lockup for places that load the logo as an image (Cloudflare Access login page): theme variables do not resolve in <img>, so bake in the brand colors.
const MARK_COLORS = {
  "logo-mark-black": "#2b2a29",
  "logo-mark-yellow": "#ffed00",
  "logo-mark-magenta": "#e5097f",
  "logo-mark-cyan": "#00a0e3",
};
const WORDMARK_COLOR = "#2f2f2f";

export function accessLoginLogo(lockupSvg) {
  let svg = lockupSvg
    .replace(/<g id="truong-thinh-subtitle-en"[\s\S]*?<\/g>\s*/, "")
    .replace(/fill="currentColor"/, `fill="${WORDMARK_COLOR}"`);
  for (const [name, color] of Object.entries(MARK_COLORS)) svg = svg.replace(`var(--${name}, currentColor)`, color);
  if (/var\(|currentColor|display="none"/.test(svg)) throw new Error("Access login logo still depends on page styles.");
  return svg;
}
