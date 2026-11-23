// Nightly dead-Cron check (owner 2026-11-23: "nếu dùng cron thì phải có fallback, kiểm tra khi cron chết"; cms.md R6):
// reads cronAt from the admin snapshot index with the CMS service token and exits 1 when the Cron heartbeat is older than
// CRON_STALE_MS, so the nightly run turns red and nightly-card opens a Notion card. Paused publishing (423) is not checked.
import { CRON_STALE_MS, cronStale } from "../../src/worker/dispatch.mjs";

const env = process.env;
const response = await fetch(`${env.CMS_ADMIN_ORIGIN}/api/admin/snapshot`, {
  headers: { "CF-Access-Client-Id": env.CMS_ACCESS_CLIENT_ID ?? "", "CF-Access-Client-Secret": env.CMS_ACCESS_CLIENT_SECRET ?? "", "User-Agent": "tt-cms-ci" },
  redirect: "error",
});
if (response.status === 423) console.log("check-cron: publishing is paused; not checked");
else if (response.status !== 200) { console.error(`check-cron: snapshot HTTP ${response.status}`); process.exitCode = 1; }
else {
  const { cronAt } = await response.json();
  console.log(`check-cron: cron_at ${cronAt}`);
  if (cronStale(cronAt)) { console.error(`check-cron: the admin Worker Cron has not run for more than ${CRON_STALE_MS / 60000} minutes`); process.exitCode = 1; }
}
