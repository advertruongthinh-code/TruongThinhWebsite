// One-off (cms-plan part 2 K6, task E5): writes the compiled Advertising card manifest to the content JSON files the build
// now reads. Run once from the commit before E5: node scripts/cms/export-advertising-cards.mjs
import { writeFileSync } from "node:fs";
import { ADVERTISING_MEDIA_MANIFEST, MERGED_CARD_REDIRECTS } from "../../src/site/advertising-products/media-manifest.mjs";

const out = new URL("../../src/site/content/", import.meta.url);
writeFileSync(new URL("advertising-cards.json", out), `${JSON.stringify(ADVERTISING_MEDIA_MANIFEST, null, 2)}\n`);
writeFileSync(new URL("advertising-merged.json", out), `${JSON.stringify(MERGED_CARD_REDIRECTS, null, 2)}\n`);
