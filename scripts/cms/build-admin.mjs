#!/usr/bin/env node
// Build the admin Worker's asset folder .admin-output after `prepare:site` (cms-editor R9, CMS plan E12): a full copy of
// .site-output (so the preview iframe loads the site's own /style.css, /motion.js, /assets/... at their real URLs) without
// sw.js, plus admin/: src/admin, Dockview, the pure shared modules under admin/lib/ (same relative paths, so their imports
// resolve in the browser), an empty same-origin shell for the preview iframe and the list of content files in the repo.
// The public site is built from .site-output and never contains admin files.
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KINDS, SECTORS } from "../site/block-pages.mjs";
import { readPageSource } from "../site/sync-site-menu.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const site = path.join(root, ".site-output");
export const ADMIN_OUTPUT = path.join(root, ".admin-output");
const admin = path.join(ADMIN_OUTPUT, "admin");
// Entry points of the browser copy; every module they import statically is copied too.
export const LIB_ENTRIES = [
  ...(await readdir(path.join(root, "src/cms"))).filter((file) => file.endsWith(".mjs")).map((file) => `src/cms/${file}`),
  ...["blocks", "block-pages", "slots", "media-src", "client-logos", "lib-pure", "page-finish"].map((name) => `scripts/site/${name}.mjs`),
];

// Static relative imports from the entries; a bare or node: import means the module is not pure and stops the build.
export async function libModules(entries = LIB_ENTRIES) {
  const seen = new Set();
  const visit = async (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = await readFile(path.join(root, file), "utf8");
    for (const [, specifier] of source.matchAll(/(?:\bfrom|^import)\s*["']([^"']+)["']/gm)) {
      if (!specifier.startsWith(".")) throw new Error(`${file} imports "${specifier}": admin/lib takes pure modules only`);
      await visit(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
    }
  };
  for (const entry of entries) await visit(entry);
  return [...seen].sort();
}

// The editor puts the page HTML in window.parent.TTPreview and loads this shell per render. The shell sets the page's real path
// as its URL first, then writes the HTML itself: document.open() called by the parent would give the iframe the admin URL, and the
// site's scripts read location. A fresh load per render also drops the old page's timers and animations.
const PREVIEW_SHELL = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Xem trước</title>
<script>
  const html = window.parent.TTPreview?.html();
  if (html) {
    history.replaceState(null, "", new URLSearchParams(location.search).get("path") || "/");
    document.open();
    document.write(html);
    document.close();
  }
</script></head><body></body></html>
`;

export async function buildAdmin() {
  if (!existsSync(path.join(site, "index.html"))) throw new Error("Run `pnpm prepare:site` before building the admin.");
  const modules = await libModules();
  await rm(ADMIN_OUTPUT, { recursive: true, force: true });
  // The site's service worker would cache admin responses: the copy leaves it out.
  await cp(site, ADMIN_OUTPUT, { recursive: true, filter: (source) => source !== path.join(site, "sw.js") });
  await cp(path.join(root, "src/admin"), admin, { recursive: true });
  // The editor opens at the cms root (owner 2026-11-28): its page replaces the site copy's home (the preview reads frames from
  // admin/pages, never the copy's home), <base> keeps its relative URLs under admin/, and old /admin/ links redirect to /.
  const editor = await readFile(path.join(admin, "index.html"), "utf8");
  await writeFile(path.join(ADMIN_OUTPUT, "index.html"), editor.replace("<head>", '<head>\n    <base href="/admin/" />'));
  await rm(path.join(admin, "index.html"));
  const redirects = path.join(ADMIN_OUTPUT, "_redirects");
  await writeFile(redirects, `/admin / 301\n/admin/ / 301\n${existsSync(redirects) ? await readFile(redirects, "utf8") : ""}`);
  const vendor = path.join(admin, "vendor/dockview");
  await mkdir(vendor, { recursive: true });
  await cp(path.join(root, "node_modules/dockview/dist/dockview.min.js"), path.join(vendor, "dockview.min.js"));
  await cp(path.join(root, "node_modules/dockview/dist/styles/dockview.css"), path.join(vendor, "dockview.css"));
  for (const file of modules) {
    await mkdir(path.dirname(path.join(admin, "lib", file)), { recursive: true });
    await cp(path.join(root, file), path.join(admin, "lib", file));
  }
  await writeFile(path.join(admin, "preview.html"), PREVIEW_SHELL);
  // Frame pages of the block-built kinds (News uses About; a project its sector) and the shared head script, for the preview.
  const frames = [...new Set([...SECTORS, ...Object.values(KINDS).map((kind) => kind.frame({ sector: SECTORS[0] }))])];
  await mkdir(path.join(admin, "pages/frames"), { recursive: true });
  for (const frame of frames) await writeFile(path.join(admin, "pages/frames", `${frame}.html`), readPageSource(`${frame}/index.html`));
  await cp(path.join(root, "src/site/head-inline.js"), path.join(admin, "head-inline.js"));
  // Content files the repo build has, like the build's existsSync: the preview picks only variants that exist.
  const files = (await readdir(path.join(site, "assets/content"), { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => `/${path.relative(site, path.join(entry.parentPath, entry.name)).split(path.sep).join("/")}`)
    .sort();
  await writeFile(path.join(admin, "repo-files.json"), JSON.stringify(files));
  return { modules, files: files.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { modules, files } = await buildAdmin();
  console.log(`[build-admin] .admin-output: site copy, ${modules.length} lib modules, ${files} repo content files`);
}
