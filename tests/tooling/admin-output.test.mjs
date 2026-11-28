import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// Admin build output (cms-editor R9, CMS plan E12): the public build has no admin; .admin-output carries the site copy
// without sw.js and an admin/lib that holds exactly the pure modules reached from the entries.
const built = existsSync(".site-output/index.html");

test("the public build has no admin files", { skip: !built && "site not built" }, () => {
  assert.equal(existsSync(".site-output/admin"), false);
});

test("build-admin writes .admin-output with only pure lib modules and no service worker", { skip: !built && "site not built" }, async () => {
  const { ADMIN_OUTPUT, buildAdmin, libModules } = await import("../../scripts/cms/build-admin.mjs");
  const { modules } = await buildAdmin();
  assert.equal(existsSync(path.join(ADMIN_OUTPUT, "sw.js")), false);
  // The editor is the root page (base admin/), /admin/ redirects to it.
  assert.match(readFileSync(path.join(ADMIN_OUTPUT, "index.html"), "utf8"), /<base href="\/admin\/" \/>[\s\S]*src="\.\/editor\.js"/);
  assert.equal(existsSync(path.join(ADMIN_OUTPUT, "admin/index.html")), false);
  assert.match(readFileSync(path.join(ADMIN_OUTPUT, "_redirects"), "utf8"), /^\/admin \/ 301\n\/admin\/ \/ 301\n/);
  for (const file of ["admin/editor.js", "admin/preview.html", "admin/overlay.js", "admin/overlay.css", "admin/page-editor.css", "admin/head-inline.js",
    "admin/pages/frames/about.html", "admin/pages/frames/residential.html", "admin/pages/frames/commercial.html", "admin/vendor/dockview/dockview.min.js"]) {
    assert.equal(existsSync(path.join(ADMIN_OUTPUT, file)), true, file);
  }
  const lib = path.join(ADMIN_OUTPUT, "admin/lib");
  const copied = readdirSync(lib, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
    .map((entry) => path.relative(lib, path.join(entry.parentPath, entry.name)).split(path.sep).join("/")).sort();
  assert.deepEqual(copied, modules);
  assert.deepEqual(modules, await libModules());
  for (const file of copied) {
    assert.doesNotMatch(readFileSync(path.join(lib, file), "utf8"), /\b(?:from|import)\s*\(?\s*["']node:/, file);
  }
  const files = JSON.parse(readFileSync(path.join(ADMIN_OUTPUT, "admin/repo-files.json"), "utf8"));
  assert.ok(files.length > 0 && files.every((file) => file.startsWith("/assets/content/")));
});

test("libModules refuses a module that is not pure", async () => {
  const { libModules } = await import("../../scripts/cms/build-admin.mjs");
  await assert.rejects(libModules(["scripts/cms/build-admin.mjs"]), /node:fs.*pure modules only/);
});
