// One Cron Trigger "* * * * *" (CMS plan Q11). runCron picks the jobs by the UTC hour and minute of event.scheduledTime:
// | UTC minute | Job                                                       |
// | every      | settleVariants (P3), except daily job minutes; minutes divisible by 5 add retryBuild (P4) |
// | 18:00      | exportDatabase (S5)                                       |
// | 18:05      | pruneBackups (S5), checkAccessDrift (P7, part 2)          |
// | 18:10      | purgeOldTrash (P8, part 2)                                |
// | 18:15      | pruneAudit, removeOrphans (P8, part 2)                    |
import { exportDatabase, pruneBackups } from "./backup.mjs";
import { retryBuild } from "./dispatch.mjs";
import { settleVariants } from "./variants.mjs";

const DAILY = { "18:00": [exportDatabase], "18:05": [pruneBackups] }; // later tasks add entries

// Awaited rather than handed to waitUntil, so the invocation stays alive for the whole export poll.
export async function runCron(event, env, ctx) {
  const scheduled = new Date(event.scheduledTime);
  const time = scheduled.toISOString().slice(11, 16);
  // A daily job minute skips settleVariants, so the export's fetches and the R2 reads never share one invocation's limits.
  if (!DAILY[time]) ctx?.waitUntil(settleVariants(env, ctx).catch((error) => console.error("settleVariants", error)));
  if (scheduled.getUTCMinutes() % 5 === 0) ctx?.waitUntil(retryBuild(env).catch((error) => console.error("retryBuild", error)));
  await Promise.all((DAILY[time] ?? []).map((job) => job(env).catch((error) => console.error(job.name, error))));
}
