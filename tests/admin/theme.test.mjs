import assert from "node:assert/strict";
import test from "node:test";
import { THEME_KEY, initTheme, normalizePref, resolveTheme } from "../../src/admin/theme.mjs";

const fakeMedia = (matches) => {
  const media = { matches, listeners: [], addEventListener: (_, fn) => media.listeners.push(fn) };
  media.flip = (value) => { media.matches = value; media.listeners.forEach((fn) => fn()); };
  return media;
};
const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
};

test("resolveTheme: explicit choice wins, system follows the OS", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});

test("normalizePref: anything unknown falls back to system", () => {
  assert.equal(normalizePref("dark"), "dark");
  for (const bad of [null, undefined, "", "auto", "Dark"]) assert.equal(normalizePref(bad), "system");
});

test("initTheme restores the stored choice, persists a new one and sets data-theme", () => {
  const root = { dataset: {} };
  const storage = fakeStorage({ [THEME_KEY]: "dark" });
  const seen = [];
  const theme = initTheme({ storage, root, media: fakeMedia(false), onChange: (resolved) => seen.push(resolved) });
  assert.equal(root.dataset.theme, "dark");
  theme.set("light");
  assert.equal(storage.data[THEME_KEY], "light");
  assert.equal(root.dataset.theme, "light");
  assert.deepEqual(seen, ["dark", "light"]);
});

test("initTheme in system mode follows prefers-color-scheme changes; an explicit choice ignores them", () => {
  const media = fakeMedia(false);
  const seen = [];
  const theme = initTheme({ storage: fakeStorage(), root: { dataset: {} }, media, onChange: (resolved) => seen.push(resolved) });
  media.flip(true);
  theme.set("light");
  media.flip(false);
  media.flip(true);
  assert.deepEqual(seen, ["light", "dark", "light", "light", "light"]);
});

test("initTheme survives storage that throws", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const root = { dataset: {} };
  const theme = initTheme({ storage, root, media: fakeMedia(true) });
  assert.equal(root.dataset.theme, "system");
  theme.set("dark");
  assert.equal(theme.get(), "dark");
});
