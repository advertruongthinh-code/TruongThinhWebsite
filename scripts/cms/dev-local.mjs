#!/usr/bin/env node
// Run the CMS locally: build the static site, build .admin-output, apply local D1 migrations, then `wrangler dev`.
// No deploy, no real Cloudflare resources; data lives in `.wrangler/`.
import { spawnSync } from "node:child_process";

const CONFIG = "scripts/cms/wrangler.local.toml";
const PORT = process.env.CMS_PORT || "8788";

function run(args) {
  const result = spawnSync("pnpm", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["prepare:site"]);
// The admin goes to its own folder .admin-output (a copy of the site plus admin/); the public build never has admin files.
const admin = spawnSync("node", ["scripts/cms/build-admin.mjs"], { stdio: "inherit" });
if (admin.status !== 0) process.exit(admin.status ?? 1);
run(["demo:wrangler", "d1", "migrations", "apply", "DB", "--local", "--config", CONFIG]);
if (process.argv.includes("--setup-only")) process.exit(0);
run(["demo:wrangler", "dev", "--config", CONFIG, "--ip", "127.0.0.1", "--port", PORT]);
