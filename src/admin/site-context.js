// What the preview and the Còn thiếu tab read once per session (cms-editor R3): published News and projects (`context`), the contact
// record, the frame pages, the files the repo build has and the shared head script. Cached; `refreshContext` after a save.
import { call } from "./api.js";

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
