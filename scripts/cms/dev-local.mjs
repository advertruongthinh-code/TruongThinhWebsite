#!/usr/bin/env node
// Chạy CMS local: build site tĩnh, chép admin, áp migration D1 local, rồi `wrangler dev`.
// Không deploy, không tạo tài nguyên Cloudflare thật; dữ liệu nằm trong `.wrangler/`.
import { spawnSync } from "node:child_process";

const CONFIG = "scripts/cms/wrangler.local.toml";
const PORT = process.env.CMS_PORT || "8788";

function run(args) {
  const result = spawnSync("pnpm", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["prepare:site"]);
// Admin chỉ dựng vào output khi chạy local; `prepare:site` xóa output nên bản demo không chứa admin.
const admin = spawnSync("node", ["scripts/cms/build-admin.mjs"], { stdio: "inherit" });
if (admin.status !== 0) process.exit(admin.status ?? 1);
run(["demo:wrangler", "d1", "migrations", "apply", "DB", "--local", "--config", CONFIG]);
if (process.argv.includes("--setup-only")) process.exit(0);
run(["demo:wrangler", "dev", "--config", CONFIG, "--ip", "127.0.0.1", "--port", PORT]);
