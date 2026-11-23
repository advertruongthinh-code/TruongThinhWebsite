// Shared HTTP helpers of the admin Worker (docs/specs/cms.md R1, R4).
const MAX_JSON_BYTES = 600_000;

export function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store" },
  });
}

// A refusal a handler throws; route() turns it into a response and an audit row. target = { type, id } when known.
export class HttpError extends Error {
  constructor(status, body, target) {
    super(body?.error ?? String(status));
    this.status = status;
    this.body = body;
    this.target = target;
  }
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function readJson(request) {
  const declared = Number(request.headers.get("Content-Length"));
  if (declared > MAX_JSON_BYTES) throw new HttpError(413, { error: "too large" });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) throw new HttpError(413, { error: "too large" });
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, { error: "invalid json" });
  }
}

export function auditStatement(env, actor, command, type, id, result, { detail = null } = {}) {
  return env.DB
    .prepare("INSERT INTO audit_log (at, email, command, type, id, result, detail) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(new Date().toISOString(), actor.email, command, type, id, result, detail);
}
