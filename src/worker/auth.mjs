// Access JWT check and actor lookup of the admin Worker (docs/specs/cms.md R2, CMS plan Q7).
import { isPlainObject } from "./http.mjs";

const ACCESS_JWKS_TTL_MS = 60 * 60 * 1000;
let accessJwksCache = { expiresAt: 0, keys: new Map() };
const SERVICE_PATHS = new Set(["/api/admin/snapshot", "/api/admin/media-original"]);

// Dev login for `pnpm cms:dev`: needs the CMS_LOCAL_ADMIN_EMAIL variable and a loopback host.
// Production does not set this variable and does not accept loopback host requests, so it still goes only through Access.
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

// Returns { email, role } for a person, { service: true } for the build, or null (403).
export async function requireActor(request, env, url) {
  const local = localDevAdmin(request, env);
  if (local) return { email: local, role: "owner" };
  const servicePath = SERVICE_PATHS.has(url.pathname);
  const claims = await verifyAccessJwt(request, env, servicePath ? env.ACCESS_SERVICE_AUD : env.ACCESS_AUD);
  if (!claims) return null;
  if (servicePath) {
    // A service token JWT has no email; common_name is the token's client id (Cloudflare Access docs).
    return request.method === "GET" && claims.common_name && claims.common_name === env.SERVICE_TOKEN_CLIENT_ID ? { service: true } : null;
  }
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email) return null;
  const account = await env.DB.prepare("SELECT role, status FROM accounts WHERE email = ?").bind(email).first();
  if (account) return account.status === "active" ? { email, role: account.role } : null;
  return bootstrapOwner(env, email);
}

// Inserts the first owner once, only while accounts is empty and the email is CMS_BOOTSTRAP_OWNER.
export async function bootstrapOwner(env, email) {
  const owner = String(env.CMS_BOOTSTRAP_OWNER ?? "").trim().toLowerCase();
  if (!owner || email !== owner) return null;
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM accounts").first();
  if (n !== 0) return null;
  const now = new Date().toISOString();
  const inserted = await env.DB
    .prepare(
      "INSERT INTO accounts (email, role, status, created_at, created_by, updated_at, updated_by) SELECT ?, 'owner', 'active', ?, 'bootstrap', ?, 'bootstrap' WHERE NOT EXISTS (SELECT 1 FROM accounts)",
    )
    .bind(email, now, now)
    .run();
  return inserted.meta.changes === 1 ? { email, role: "owner" } : null;
}

export function hasAllowedOrigin(request, url) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === url.origin;
  } catch {
    return false;
  }
}

function localDevAdmin(request, env) {
  const email = String(env.CMS_LOCAL_ADMIN_EMAIL || "").trim().toLowerCase();
  const host = new URL(request.url).hostname;
  return email && (LOOPBACK.has(host) || host === "admin.localhost") ? email : null;
}

export async function verifyAccessJwt(request, env, audience) {
  const teamOrigin = accessTeamOrigin(env);
  const audiences = String(audience || "").split(",").map((value) => value.trim()).filter(Boolean);
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!teamOrigin || !audiences.length || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header;
  let claims;
  let signature;
  try {
    header = decodeJwtPart(parts[0]);
    claims = decodeJwtPart(parts[1]);
    signature = base64UrlBytes(parts[2]);
  } catch {
    return null;
  }
  if (!isPlainObject(header) || header.alg !== "RS256" || typeof header.kid !== "string" || !isPlainObject(claims)) return null;
  if (claims.iss !== teamOrigin || !hasExpectedAudience(claims.aud, audiences) || !validJwtTime(claims)) return null;
  const jwk = await accessJwk(teamOrigin, header.kid);
  if (!jwk) return null;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    return (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed)) ? claims : null;
  } catch {
    return null;
  }
}

function accessTeamOrigin(env) {
  try {
    const team = new URL(String(env.ACCESS_TEAM_DOMAIN || "").trim());
    return team.protocol === "https:" && team.hostname.endsWith(".cloudflareaccess.com") && team.pathname === "/" ? team.origin : null;
  } catch {
    return null;
  }
}

async function accessJwk(teamOrigin, kid) {
  if (Date.now() >= accessJwksCache.expiresAt) {
    try {
      const response = await fetch(`${teamOrigin}/cdn-cgi/access/certs`, { headers: { accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.keys)) return null;
      accessJwksCache = {
        expiresAt: Date.now() + ACCESS_JWKS_TTL_MS,
        keys: new Map(payload.keys.filter((key) => key?.kty === "RSA" && key?.alg === "RS256" && typeof key.kid === "string").map((key) => [key.kid, key])),
      };
    } catch {
      return null;
    }
  }
  return accessJwksCache.keys.get(kid) || null;
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));
}

function base64UrlBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid JWT encoding");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const decoded = atob(base64);
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const canonical = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (canonical !== value) throw new Error("Non-canonical JWT encoding");
  return bytes;
}

function hasExpectedAudience(aud, expected) {
  const tokenAudiences = Array.isArray(aud) ? aud : [aud];
  return tokenAudiences.some((value) => typeof value === "string" && expected.includes(value));
}

function validJwtTime(claims) {
  const now = Math.floor(Date.now() / 1000);
  return Number.isFinite(claims.exp) && claims.exp > now && (!Number.isFinite(claims.nbf) || claims.nbf <= now + 60);
}
