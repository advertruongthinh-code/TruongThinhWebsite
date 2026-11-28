// Admin API dispatch (docs/specs/cms.md R1, R2, R4; CMS plan Q7, Q9). Every non-GET refusal writes one audit row.
import { hasAllowedOrigin, requireActor } from "./auth.mjs";
import { auditStatement, HttpError, json } from "./http.mjs";
import accountAdd from "./commands/account-add.mjs";
import accountList from "./commands/account-list.mjs";
import accountUpdate from "./commands/account-update.mjs";
import auditLog from "./commands/audit-log.mjs";
import buildStatus from "./commands/build-status.mjs";
import context from "./commands/context.mjs";
import create from "./commands/create.mjs";
import get from "./commands/get.mjs";
import list from "./commands/list.mjs";
import purge from "./commands/purge.mjs";
import rebuild from "./commands/rebuild.mjs";
import reorder from "./commands/reorder.mjs";
import restore from "./commands/restore.mjs";
import resumePublish from "./commands/resume-publish.mjs";
import retryVariant from "./commands/retry-variant.mjs";
import rollback from "./commands/rollback.mjs";
import save from "./commands/save.mjs";
import mediaFile from "./commands/media-file.mjs";
import mediaList from "./commands/media-list.mjs";
import mediaOriginal from "./commands/media-original.mjs";
import snapshot from "./commands/snapshot.mjs";
import trash from "./commands/trash.mjs";
import updateMedia from "./commands/update-media.mjs";
import uploadMedia from "./commands/upload-media.mjs";
import whoami from "./commands/whoami.mjs";

// { method, owner?, service?, upload?, run(request, env, ctx, actor, url) }; later tasks add commands here.
export const COMMANDS = {
  "account-add": accountAdd,
  "account-list": accountList,
  "account-update": accountUpdate,
  "audit-log": auditLog,
  "build-status": buildStatus,
  context,
  create,
  get,
  list,
  "media-file": mediaFile,
  "media-list": mediaList,
  "media-original": mediaOriginal,
  purge,
  rebuild,
  reorder,
  restore,
  "resume-publish": resumePublish,
  "retry-variant": retryVariant,
  rollback,
  save,
  snapshot,
  trash,
  "update-media": updateMedia,
  "upload-media": uploadMedia,
  whoami,
};

export async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin/")) return env.ASSETS.fetch(request);
  const command = url.pathname.slice("/api/admin/".length);
  const handler = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;
  if (!handler) return json({ error: "Not Found" }, 404);
  try {
    const actor = await requireActor(request, env, url);
    if (!actor) return json({ error: "Forbidden" }, 403); // no audit row: there is no email to record
    if (Boolean(actor.service) !== Boolean(handler.service)) return json({ error: "Forbidden" }, 403);
    if (request.method !== handler.method) return json({ error: "Method Not Allowed" }, 405);
    const refuse = async (status, result) => {
      if (handler.method !== "GET") await auditStatement(env, actor, command, null, null, result).run();
      return json({ error: result }, status);
    };
    if (handler.method !== "GET") {
      if (!hasAllowedOrigin(request, url, env)) return refuse(403, "403 origin");
      if (!handler.upload && !(request.headers.get("Content-Type") ?? "").startsWith("application/json")) return refuse(415, "415");
      if (!(await env.ADMIN_WRITE_LIMIT.limit({ key: actor.email })).success) return refuse(429, "429");
      if (handler.upload && !(await env.ADMIN_UPLOAD_LIMIT.limit({ key: actor.email })).success) return refuse(429, "429");
    }
    if (handler.owner && actor.role !== "owner") return refuse(403, "403 role");
    try {
      return await handler.run(request, env, ctx, actor, url);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      if (handler.method !== "GET") await auditStatement(env, actor, command, error.target?.type ?? null, error.target?.id ?? null, `${error.status} ${error.body.error ?? ""}`.trim()).run();
      return json(error.body, error.status);
    }
  } catch (error) {
    console.error(command, error);
    return json({ error: "storage unavailable" }, 503);
  }
}
