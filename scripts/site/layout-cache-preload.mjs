// Inline <head> script that starts the one-filter masonry layout cache file (advertising-masonry R6) while the browser
// still parses the page, in parallel with the deferred vendor scripts. Band thresholds come from LAYOUT_BANDS, never typed here.
import { LAYOUT_BANDS } from "../../src/site/masonry/packer.mjs";

export const LAYOUT_CACHE_ROOT = "/advertising-products/layout-cache";
export const LAYOUT_CACHE_PRELOAD_MARKER = "<!-- layout-cache-preload -->";

const directory = (band) => band.key.replace(":", "-");
// Widest band first: the first band whose minWidth fits wins; narrower than every band falls to the first one.
const steps = LAYOUT_BANDS.slice(1).reverse().map((band) => [band.minWidth, directory(band)]);

// The href must match the runtime import() URL character for character (layoutCacheUrl in masonry/runtime.mjs), or the
// browser fetches the file twice.
export const layoutCachePreload = (filter) => `<script>(()=>{const w=document.documentElement.clientWidth;if(!w)return;`
  + `const b=(${JSON.stringify(steps)}.find(([m])=>w>=m)||[0,"${directory(LAYOUT_BANDS[0])}"])[1];`
  + `document.head.append(Object.assign(document.createElement("link"),{rel:"modulepreload",href:\`${LAYOUT_CACHE_ROOT}/\${b}/${filter}.mjs\`}))})();</script>`;
