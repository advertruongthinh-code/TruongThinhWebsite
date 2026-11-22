// Snapshot projection (cms-plan Q2): repo content files <-> CMS records <-> snapshot <-> content files the build reads.
// Pure module: callers read and write files; fileFacts carries each media file's { hash, bytes } computed by the seed.
import { HERO_PAGES, OPEN_TYPES, SINGLETON_TYPES } from "./contract.mjs";
import { mediaRefs } from "./media-ref.mjs";

const FILES = { news: "news.json", project: "projects.json", "advertising-card": "advertising-cards.json", "hero-slide": "hero-slides.json", "home-projects": "home-projects.json", menu: "menu.json" };
// Media id = file name without extension, cut to the 80-character id limit (a few Advertising audit files are longer).
const stem = (path) => path.split("/").pop().replace(/\.[^.]+$/, "").slice(0, 80).replace(/-+$/, "");

// files: { "news.json", "projects.json", "hero-slides.json", "home-projects.json", "menu.json" } parsed, plus `cards` (card array).
// Returns [{ type, id, data, position }]: media records first, then content in OPEN_TYPES order. Inputs are not mutated.
export function filesToRecords(files, fileFacts = new Map()) {
  const content = {
    news: files["news.json"] ?? [],
    project: files["projects.json"] ?? [],
    "advertising-card": files.cards ?? [],
    "hero-slide": HERO_PAGES.flatMap((page) => (files["hero-slides.json"]?.[page] ?? []).map((slide) => ({ ...slide, page }))),
  };
  const records = [];
  const mediaByPath = new Map();
  const usedIds = new Set();
  for (const type of OPEN_TYPES.filter((open) => content[open])) {
    for (const [position, source] of content[type].entries()) {
      const data = structuredClone(source);
      for (const ref of mediaRefs(type, data)) {
        if (ref.mediaId !== undefined) continue;
        let media = mediaByPath.get(ref.src);
        const decorative = !ref.altVi || !ref.altEn;
        if (!media) {
          const base = stem(ref.src);
          let id = base;
          for (let n = 2; usedIds.has(id); n += 1) id = `${base.slice(0, 79 - String(n).length).replace(/-+$/, "")}-${n}`;
          usedIds.add(id);
          const name = decorative ? base : undefined;
          media = { id, kind: "image", source: "repo", path: ref.src, ...fileFacts.get(ref.src), mime: "image/webp", width: ref.width, height: ref.height, altVi: name ?? ref.altVi, altEn: name ?? ref.altEn, tags: [] };
          mediaByPath.set(ref.src, media);
        }
        ref.mediaId = media.id;
        // Seeded placements kept byte for byte (Q6): project card crops, reused files with another alt, decorative hero slides.
        const legacy = type === "project" && data.card?.media?.includes(ref) || decorative || ref.altVi !== media.altVi || ref.altEn !== media.altEn;
        if (legacy) ref.legacySrc = ref.src;
        else ref.crop = [0, 0, media.width, media.height];
      }
      records.push({ type, id: data.id, data, position });
    }
  }
  const singles = [{ type: "home-projects", data: { ids: structuredClone(files["home-projects.json"] ?? []) } }, { type: "menu", data: structuredClone(files["menu.json"]) }];
  for (const single of singles) if (single.data !== undefined) records.push({ ...single, id: "main", position: 0 });
  return [...[...mediaByPath.values()].map((data, position) => ({ type: "media", id: data.id, data, position })), ...records];
}

// Seed snapshot: every record counts as published with no pending variant.
export function recordsToSnapshot(records, redirects = [], takenAt = new Date(0).toISOString()) {
  const byType = {};
  const sorted = records.filter(({ type }) => type !== "media").toSorted((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const { type, data } of sorted) (byType[type] ??= []).push(data);
  return { schema: 1, takenAt, records: byType, redirects, held: [] };
}

// Content files the build reads, as parsed JSON keyed by file name. R2 variant srcs (/v/...) get the media origin.
export function snapshotToFiles(snapshot, { mediaOrigin = "" } = {}) {
  const records = structuredClone(snapshot.records ?? {});
  for (const type of Object.keys(records)) for (const data of records[type]) for (const ref of mediaRefs(type, data)) {
    if (typeof ref.src === "string" && ref.src.startsWith("/v/")) ref.src = mediaOrigin + ref.src;
  }
  const files = {};
  const projectIds = new Set((records.project ?? []).map(({ id }) => id));
  for (const type of OPEN_TYPES.filter((open) => FILES[open])) {
    const rows = records[type] ?? [];
    if (SINGLETON_TYPES.includes(type) && !rows.length) throw new Error(`snapshot: missing ${type}`);
    if (type === "hero-slide") files[FILES[type]] = Object.fromEntries(HERO_PAGES.map((page) => [page, rows.filter((slide) => slide.page === page).map(({ page: _, ...slide }) => slide)]));
    else if (type === "home-projects") files[FILES[type]] = rows[0].ids.filter((id) => projectIds.has(id));
    else if (type === "menu") files[FILES[type]] = { ...rows[0], featuredProjects: rows[0].featuredProjects.filter((id) => projectIds.has(id)) };
    else files[FILES[type]] = rows;
  }
  files["redirects.json"] = snapshot.redirects ?? [];
  return files;
}

export async function snapshotId(text) {
  const bytes = new TextEncoder().encode(text.replace(/"takenAt":"[^"]*",/, ""));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
