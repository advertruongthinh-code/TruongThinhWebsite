// What the preview and the Còn thiếu panel read once per session (cms-editor R3): published News and projects (`context`), the contact
// record, the frame pages, the files the repo build has and the shared head script. Cached; `refreshContext` after a save.
import { call } from "./api.js";
import { IMAGE_SRC, imageFieldErrors } from "./lib/scripts/site/lib-pure.mjs";

const VARIANT_SRC = /^\/v\/[0-9a-f]{32}\/[a-z0-9-]+\.webp$/;

const cache = new Map();
const once = (key, load) => {
  if (!cache.has(key)) cache.set(key, load().catch((error) => { cache.delete(key); throw error; }));
  return cache.get(key);
};
const text = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response;
};

export const loadContext = () => once("context", async () => {
  const result = await call("context");
  if (result.error) throw new Error(`context ${result.error}`);
  return result.data;
});
export const refreshContext = () => cache.delete("context");
export const loadContact = () => once("contact", async () => {
  const result = await call("get", { query: { type: "contact", id: "main" } });
  if (result.error) throw new Error(`contact ${result.error}`);
  return result.data.data;
});
export const loadFrame = (name) => once(`frame:${name}`, async () => (await text(`/admin/pages/frames/${name}.html`)).text());
export const loadHeadInline = () => once("head", async () => `<script>\n${await (await text("/admin/head-inline.js")).text()}</script>`);
export const loadRepoFiles = () => once("files", async () => new Set(await (await text("/admin/repo-files.json")).json()));

// ctx of shapeErrors and fullErrors for the open record (the Còn thiếu panel and the preview gate read the same one).
export async function validationContext(record, mediaById) {
  const context = await loadContext();
  const byId = (rows) => new Map(rows.map((entry) => [entry.id, entry]));
  return { id: record.id, mediaById, projects: byId(context.projects), news: byId(context.news), usage: new Map(),
    checkImage: async (image, where) => imageFieldErrors(image, where, (src) => IMAGE_SRC.test(src) || VARIANT_SRC.test(src)) };
}
