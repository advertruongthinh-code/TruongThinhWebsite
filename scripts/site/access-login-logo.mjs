// Standalone mark-only logo (owner 2026-11-28; the one allowed use of the mark alone besides the favicon) for places that load the logo as an image (Cloudflare Access login page): theme variables do not resolve in <img>, so bake in the brand colors.
// Static. Four CMYK strips on a light page; one-color white when the OS is dark (brand one-color white form), via a media query that works inside <img>.
const MARK_COLORS = {
  "logo-mark-black": "#2b2a29",
  "logo-mark-yellow": "#ffed00",
  "logo-mark-magenta": "#e5097f",
  "logo-mark-cyan": "#00a0e3",
};
const DARK_STYLE = "<style>@media(prefers-color-scheme:dark){path{fill:#fff}}</style>";

export function accessLoginLogo(lockupSvg) {
  const mark = lockupSvg.match(/<g id="truong-thinh-mark"[^>]*>[\s\S]*?<\/g>/)?.[0];
  if (!mark) throw new Error("Lockup has no mark group.");
  let group = mark;
  for (const [name, color] of Object.entries(MARK_COLORS)) group = group.replace(`var(--${name}, currentColor)`, color);
  if (/var\(|currentColor|display="none"/.test(group)) throw new Error("Access login logo still depends on page styles.");
  // Mark box in lockup coordinates: 286.2 x 247.85 scaled by 0.62, starting at y 25.4515.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 25.4515 177.444 153.667">${DARK_STYLE}${group}</svg>`;
}
