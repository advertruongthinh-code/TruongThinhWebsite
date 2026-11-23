// Cloudflare Access policy of the admin app, kept in sync with the accounts table (docs/specs/cms.md R2, CMS plan P7).
// The token has only "Access: Apps and Policies Write"; the Worker touches only the policy named by its secrets.
// PUT replaces the whole policy: send every field read back except the read-only ones, so no setting is reset.
const READ_ONLY_KEYS = ["id", "uid", "created_at", "updated_at", "version", "app_count", "reusable"];

const policyUrl = (env) => `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/access/apps/${env.ACCESS_APP_ID}/policies/${env.ACCESS_POLICY_ID}`;

async function call(env, init = {}) {
  if (!env.ACCESS_API_TOKEN || !env.ACCESS_APP_ID || !env.ACCESS_POLICY_ID) throw new Error("access not configured");
  const response = await fetch(policyUrl(env), {
    ...init,
    headers: { Authorization: `Bearer ${env.ACCESS_API_TOKEN}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== 200) throw new Error(`access ${response.status}`);
  return (await response.json()).result;
}

export const readPolicy = (env) => call(env);

export async function readPolicyEmails(env) {
  return (await readPolicy(env)).include.filter((rule) => rule.email).map((rule) => rule.email.email.toLowerCase());
}

// Keeps every non-email include rule and every other policy field; only the email rules are replaced.
export async function writePolicyEmails(env, emails) {
  const policy = await readPolicy(env);
  const body = Object.fromEntries(Object.entries(policy).filter(([key]) => !READ_ONLY_KEYS.includes(key)));
  body.include = [...policy.include.filter((rule) => !rule.email), ...[...new Set(emails)].map((email) => ({ email: { email } }))];
  await call(env, { method: "PUT", body: JSON.stringify(body) });
}

export const addPolicyEmail = async (env, email) => writePolicyEmails(env, [...(await readPolicyEmails(env)), email]);
// Read back after the write: a concurrent add that read the policy earlier could have put the email back.
export async function removePolicyEmail(env, email) {
  await writePolicyEmails(env, (await readPolicyEmails(env)).filter((entry) => entry !== email));
  if ((await readPolicyEmails(env)).includes(email)) throw new Error("access still lists the email");
}

// Daily (cron 18:05): records the difference, never repairs it; an empty string means in sync.
export async function checkAccessDrift(env) {
  const [policy, { results }] = await Promise.all([
    readPolicyEmails(env),
    env.DB.prepare("SELECT email FROM accounts WHERE status = 'active'").all(),
  ]);
  const active = new Set(results.map((row) => row.email));
  const inPolicy = new Set(policy);
  const onlyAccess = [...inPolicy].filter((email) => !active.has(email)).sort();
  const onlyAccounts = [...active].filter((email) => !inPolicy.has(email)).sort();
  const value = onlyAccess.length || onlyAccounts.length ? JSON.stringify({ onlyAccess, onlyAccounts }) : "";
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('access_drift', ?)").bind(value).run();
}
