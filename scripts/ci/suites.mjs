// CI test suites per website part (docs/specs/ci-test-suites.md).
// node scripts/ci/suites.mjs --select [--event <event name>] [--base <ref>]  -> JSON of suite ids for the matrix
// node scripts/ci/suites.mjs <id>        -> build, open preview on a free port, run the suite's commands
// node scripts/ci/suites.mjs --changed   -> run the suites that --select picks against origin/main
// node scripts/ci/suites.mjs --all       -> JSON of every suite for the nightly run
import { execFileSync, execSync, spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { matchesGlob } from "node:path";
import { fileURLToPath } from "node:url";

export const manifest = JSON.parse(readFileSync(new URL("../../tests/ci-suites.json", import.meta.url), "utf8"));
const ids = Object.keys(manifest.suites).filter((id) => manifest.suites[id].tests.length);

// `source:` globs in spec frontmatter, read the same way as scripts/docs/check-docs.mjs.
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
    // Code file belonging to no suite: run everything to be safe (R3 item 5).
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

// Per-command timing table for the job summary (spec R10).
export const timingTable = (timings) => [
  "| Suite | Seconds | Result | Command |",
  "| --- | --- | --- | --- |",
  ...timings.map((t) => `| ${t.suite} | ${t.seconds} | ${t.status === 0 ? "PASS" : "FAIL"} | \`${t.cmd}\` |`),
].join("\n");

async function run(suiteIds) {
  // Command string runs through the shell: Windows only has pnpm.cmd, execFileSync("pnpm") fails with ENOENT.
  execSync("pnpm prepare:site", { stdio: "inherit" });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  // Preview log is written to a file so CI can attach it when a suite is red.
  const log = openSync("static-server.log", "w");
  const timings = [];
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
        const seconds = Math.round((Date.now() - t0) / 1000);
        timings.push({ suite: id, cmd, seconds, status });
        console.log(`[${id}] ${status === 0 ? "PASS" : "FAIL"} ${seconds}s ${cmd}`);
        if (status !== 0) failed.push(`${id}: ${cmd}`);
      }
    }
    if (failed.length) throw new Error(`failed:\n${failed.join("\n")}`);
  } finally {
    server.kill();
    // CI uploads this file as an artifact; GitHub reads the job summary from GITHUB_STEP_SUMMARY.
    mkdirSync(".tmp", { recursive: true });
    writeFileSync(".tmp/suite-timing.json", JSON.stringify(timings, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${timingTable(timings)}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
  const changed = (base) => execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" }).split("\n").filter(Boolean);
  if (args[0] === "--all") {
    console.log(JSON.stringify(ids));
  } else if (args[0] === "--select") {
    console.log(JSON.stringify(select(changed(flag("--base", "origin/main")), flag("--event", "pull_request"))));
  } else {
    // Docs gate first (docs-system.md R4): the local run checks spec sync against origin/main, so a missing Spec line shows before the push.
    if (args[0] === "--changed" && spawnSync(process.execPath, ["scripts/docs/check-docs.mjs"], { stdio: "inherit" }).status !== 0) process.exit(1);
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
