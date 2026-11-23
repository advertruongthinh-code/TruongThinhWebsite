// Advertising cards from the content files (cms-plan part 2 K6): advertising-cards.json holds the card records, and
// advertising-merged.json maps a merged card id to its cover card id (old p/<id> URLs redirect there). Build-only: the
// browser loads the generated artifact, never this file.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentDirOf, loadVariants } from "../../../scripts/site/content-files.mjs";
import { variantImageErrors, variantKeyOf } from "../../../scripts/site/media-src.mjs";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const contentDir = contentDirOf(siteRoot);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const deepFreeze = (value) => {
  if (value && typeof value === "object") Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

// A content dir without the file (a test fixture of other content) keeps the repo's; a snapshot always writes the cards file.
// Merged ids are frozen history, not edited in the CMS, so a snapshot has no merged file and keeps the repo's list.
const contentFile = (name) => (existsSync(path.join(contentDir, name)) ? path.join(contentDir, name) : path.join(siteRoot, "content", name));
export const ADVERTISING_MEDIA_MANIFEST = deepFreeze(readJson(contentFile("advertising-cards.json")));
export const MERGED_CARD_REDIRECTS = deepFreeze(readJson(contentFile("advertising-merged.json")));

// A card media on the media origin is checked against its variants.json manifest (K4).
const variants = loadVariants(siteRoot);
const mediaOrigin = (process.env.CMS_MEDIA_ORIGIN ?? "").replace(/\/+$/, "");
const r2Errors = ADVERTISING_MEDIA_MANIFEST.flatMap((card) => card.mediaItems
  .filter((item) => variantKeyOf(item.src))
  .flatMap((item) => variantImageErrors(item, `advertising-cards.json ${card.id} media ${item.id}`, { variants, mediaOrigin })));
if (r2Errors.length) throw new Error(r2Errors.join("\n"));
