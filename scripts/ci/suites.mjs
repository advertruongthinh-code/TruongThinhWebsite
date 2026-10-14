// Bộ test CI theo phần website (docs/specs/ci-test-suites.md).
// node scripts/ci/suites.mjs --select [--event <tên sự kiện>] [--base <ref>]  -> JSON id bộ cho matrix
// node scripts/ci/suites.mjs <id>        -> build, mở preview port trống, chạy lệnh của bộ
// node scripts/ci/suites.mjs --changed   -> chạy các bộ mà --select chọn so với origin/main
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { openSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { matchesGlob } from "node:path";
import { fileURLToPath } from "node:url";

export const manifest = JSON.parse(readFileSync(new URL("../../tests/ci-suites.json", import.meta.url), "utf8"));
const ids = Object.keys(manifest.suites).filter((id) => manifest.suites[id].tests.length);

// Glob `source:` trong frontmatter spec, cùng cách đọc với scripts/docs/check-docs.mjs.
const specSources = (spec) => {
  const block = readFileSync(`docs/specs/${spec}.md`, "utf8").match(/^source:\n((?:\s+- .+\n)+)/m);
  return block ? block[1].split("\n").filter(Boolean).map((line) => line.replace(/^\s+- /, "").trim()) : [];
};
const testFiles = (cmd) => cmd.match(/tests\/site\/[\w.*-]+/g) ?? [];
const any = (file, globs) => globs.some((glob) => matchesGlob(file, glob));

export function select(files, event = "pull_request") {
  const code = files.filter((file) => !any(file, manifest.ignore) || any(file, manifest.fastOnly));
  if (!code.length) return [];
  if (event !== "pull_request") return ids;
  const picked = new Set(["fast"]);
  for (const file of code) {
    if (any(file, manifest.fastOnly)) continue;
    if (any(file, manifest.shared)) return ids;
    const hits = ids.filter((id) => {
      const suite = manifest.suites[id];
      return any(file, suite.specs.flatMap(specSources)) || suite.tests.some((cmd) => testFiles(cmd).some((glob) => matchesGlob(file, glob)));
    });
    // File code không thuộc bộ nào: chạy đủ cho an toàn (R3 mục 5).
    if (!hits.length) return ids;
    hits.forEach((id) => picked.add(id));
  }
  return ids.filter((id) => picked.has(id));
}

const freePort = () => new Promise((resolve) => {
  const server = createServer().listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

async function run(suiteIds) {
  execFileSync("pnpm", ["prepare:site"], { stdio: "inherit" });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  // Log preview ghi ra file để CI đính kèm khi bộ đỏ.
  const log = openSync("static-server.log", "w");
  const server = spawn("node", ["scripts/tooling/serve-static-parity.mjs", "--port", String(port)], { stdio: ["ignore", log, log] });
  try {
    for (let i = 0; !(await fetch(`${baseUrl}/vi/`).then((r) => r.ok, () => false)); i++) {
      if (i > 30) throw new Error(`preview did not start on ${baseUrl}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
    const failed = [];
    for (const id of suiteIds) {
      for (const cmd of manifest.suites[id].tests) {
        console.log(`\n[${id}] ${cmd}`);
        const t0 = Date.now();
        const { status } = spawnSync(cmd, { shell: true, stdio: "inherit", env: { ...process.env, BASE_URL: baseUrl } });
        console.log(`[${id}] ${status === 0 ? "PASS" : "FAIL"} ${((Date.now() - t0) / 1000).toFixed(0)}s ${cmd}`);
        if (status !== 0) failed.push(`${id}: ${cmd}`);
      }
    }
    if (failed.length) throw new Error(`failed:\n${failed.join("\n")}`);
  } finally {
    server.kill();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
  const changed = (base) => execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" }).split("\n").filter(Boolean);
  if (args[0] === "--select") {
    console.log(JSON.stringify(select(changed(flag("--base", "origin/main")), flag("--event", "pull_request"))));
  } else {
    const suiteIds = args[0] === "--changed" ? select(changed("origin/main")) : args;
    const unknown = suiteIds.filter((id) => !ids.includes(id));
    if (!suiteIds.length) {
      console.log(args[0] === "--changed" ? "no suite selected for these changes" : `usage: suites.mjs <${ids.join("|")}> | --changed | --select`);
      process.exit(0);
    }
    if (unknown.length) {
      console.error(`unknown suite: ${unknown.join(", ")}`);
      process.exit(1);
    }
    await run(suiteIds).catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
  }
}
