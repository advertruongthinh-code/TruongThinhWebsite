import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("docs gate diagnoses malformed percent encoding without crashing", (t) => {
  const temporary = fileURLToPath(new URL("../../.tmp/", import.meta.url));
  mkdirSync(temporary, { recursive: true });
  const root = mkdtempSync(join(temporary, "tt-docs-link-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
  writeFileSync(join(root, "README.md"), "[Broken link](%E0)\n");
  execFileSync("git", ["add", "README.md"], { cwd: root });
  for (const directory of ["design-system", "src/site", "scripts/docs"]) mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, "design-system/tokens.json"), "{}");
  writeFileSync(join(root, "src/site/style.css"), ":root {\n\n}\n");
  for (const script of ["build-design-system.mjs", "build-design-md.mjs"]) writeFileSync(join(root, "scripts/docs", script), "");
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../../scripts/docs/check-docs.mjs", import.meta.url))], {
    cwd: root, encoding: "utf8", env: { ...process.env, DOCS_BASE: "" },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /README\.md:1: malformed link %E0/);
  assert.match(result.stderr, /qa:docs FAIL: 1 errors/);
  assert.doesNotMatch(result.stderr, /URIError/);
});
