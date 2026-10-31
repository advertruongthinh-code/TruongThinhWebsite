#!/usr/bin/env node
// Chạy CMS local: build site tĩnh, chép admin, áp migration D1 local, rồi `wrangler dev`.
// Không deploy, không tạo tài nguyên Cloudflare thật; dữ liệu nằm trong `.wrangler/`.
import { spawnSync } from "node:child_process";
import { cp } from "node:fs/promises";

const CONFIG = "wrangler.cms-local.toml";
const PORT = process.env.CMS_PORT || "8788";

function run(args) {
  const result = spawnSync("pnpm", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["prepare:site"]);
// Admin chỉ chép vào output khi chạy local; `prepare:site` xóa output nên bản demo không chứa admin.
await cp("src/admin", ".site-output/admin", { recursive: true });
run(["demo:wrangler", "d1", "migrations", "apply", "DB", "--local", "--config", CONFIG]);
if (process.argv.includes("--setup-only")) process.exit(0);
run(["demo:wrangler", "dev", "--config", CONFIG, "--ip", "127.0.0.1", "--port", PORT]);
