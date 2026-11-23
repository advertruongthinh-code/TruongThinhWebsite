// Real repo content as CMS records (cms-plan A5 section 6): the content files plus the Advertising card manifest.
import { readFileSync } from "node:fs";
import { ADVERTISING_MEDIA_MANIFEST } from "../../src/site/advertising-products/media-manifest.mjs";
import { filesToRecords } from "../../src/cms/projection.mjs";
import { fileImageCheck } from "../../scripts/site/content-files.mjs";

const SITE = new URL("../../src/site/", import.meta.url).pathname;
export const FILE_NAMES = ["news.json", "projects.json", "hero-slides.json", "home-projects.json", "menu.json", "contact.json"];
export const repoFiles = () => ({
  ...Object.fromEntries(FILE_NAMES.map((name) => [name, JSON.parse(readFileSync(`${SITE}content/${name}`, "utf8"))])),
  cards: JSON.parse(JSON.stringify(ADVERTISING_MEDIA_MANIFEST)),
});
export const seed = () => {
  const files = repoFiles();
  const records = filesToRecords(files);
  const ctx = {
    mediaById: new Map(records.filter(({ type }) => type === "media").map(({ id, data }) => [id, data])),
    projects: new Map(files["projects.json"].map((page) => [page.id, page])),
    news: new Map(files["news.json"].map((page) => [page.id, page])),
    checkImage: fileImageCheck(SITE),
  };
  return { files, records, ctx, find: (type, id) => structuredClone(records.find((record) => record.type === type && record.id === id).data) };
};
