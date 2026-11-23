#!/usr/bin/env node
// Deterministic token tool for the owner's PC (docs/operations/cms-storage-runbook.md "Token tự động").
//   pnpm token:setup        store the bootstrap Cloudflare token (template "Create additional tokens") once
//   pnpm token:roll <name>  create a fresh scoped token, pipe it into its Worker/GitHub targets, delete the old one
//   pnpm token:list         every Cloudflare user token with its expiry, plus the local registry
// Token values only travel through memory and child stdin; nothing here prints or logs them.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const API = 'https://api.cloudflare.com/client/v4';
const REPO = 'advertruongthinh-code/TruongThinhWebsite';
const HOME_DIR = join(homedir(), '.truongthinh');
export const ADMIN_FILE = join(HOME_DIR, 'cf-token-admin');
const REGISTRY_FILE = join(HOME_DIR, 'token-registry.json');
const DAY = 86400000;

// One entry per credential. `permissions` are Cloudflare permission group names (account scope);
// `seedFrom` copies the policies of an existing token instead (the seed itself is never deleted here).
export const TOKENS = {
  'd1-export': { name: 'tt-d1-export', permissions: ['D1 Write'], days: 365, worker: ['D1_EXPORT_TOKEN'] },
  'cms-access': { name: 'tt-cms-access', permissions: ['Access: Apps and Policies Write'], days: 365, worker: ['ACCESS_API_TOKEN'] },
  'ci-deploy': {
    name: 'tt-ci-deploy', seedFrom: 'Edit Cloudflare Workers', days: 365,
    github: [{ secret: 'CLOUDFLARE_API_TOKEN', env: 'cloudflare-deploy' }],
    dropVariables: [{ name: 'CLOUDFLARE_API_TOKEN', env: 'cloudflare-deploy' }],
  },
  // GitHub has no API that creates fine-grained PATs: the owner makes it, the tool fans it out and records the expiry.
  'cms-dispatch': { manual: 'GitHub fine-grained token tt-cms-dispatch', days: 365, worker: ['GITHUB_ACTIONS_TOKEN'] },
};

export async function cf(token, path, { method = 'GET', body, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) throw new Error(`Cloudflare ${method} ${path}: ${(json.errors || []).map((e) => e.message).join('; ') || res.status}`);
  return json.result;
}

export function expiry(days, now = Date.now()) {
  return new Date(now + days * DAY).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export async function policiesFor(entry, { token, accountId, tokens, fetchImpl }) {
  if (entry.seedFrom) {
    const seed = tokens.find((t) => t.name === entry.name) || tokens.find((t) => t.name === entry.seedFrom);
    if (!seed) throw new Error(`no token named "${entry.seedFrom}" or "${entry.name}" to copy permissions from`);
    const full = await cf(token, `/user/tokens/${seed.id}`, { fetchImpl });
    return full.policies.map(({ effect, resources, permission_groups }) => ({
      effect, resources, permission_groups: permission_groups.map(({ id }) => ({ id })),
    }));
  }
  const groups = await cf(token, '/user/tokens/permission_groups', { fetchImpl });
  const ids = entry.permissions.map((name) => {
    const g = groups.find((x) => x.name === name);
    if (!g) throw new Error(`unknown permission group "${name}"`);
    return { id: g.id };
  });
  return [{ effect: 'allow', resources: { [`com.cloudflare.api.account.${accountId}`]: '*' }, permission_groups: ids }];
}

// Runs a command with the secret on stdin only. shell is needed for pnpm.cmd/gh.exe on Windows;
// every argument comes from TOKENS above, never from user input.
export function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: process.platform === 'win32', stdio: ['pipe', 'ignore', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.slice(0, 3).join(' ')} exited ${code}`))));
    child.stdin.end(input);
  });
}

export async function pushTargets(entry, value, runImpl = run) {
  for (const name of entry.worker || []) await runImpl('pnpm', ['demo:wrangler', 'secret', 'put', name, '--config', 'wrangler.toml'], value);
  for (const { secret, env } of entry.github || []) {
    await runImpl('gh', ['secret', 'set', secret, '--repo', REPO, ...(env ? ['--env', env] : [])], value);
  }
  for (const { name, env } of entry.dropVariables || []) {
    await runImpl('gh', ['variable', 'delete', name, '--repo', REPO, ...(env ? ['--env', env] : [])], '').catch(() => {});
  }
}

export async function roll(key, { token, accountId, fetchImpl = fetch, runImpl = run, now = Date.now(), promptImpl = prompt } = {}) {
  const entry = TOKENS[key];
  if (!entry) throw new Error(`unknown token "${key}"; known: ${Object.keys(TOKENS).join(', ')}`);
  if (entry.manual) {
    const value = await promptImpl(`Paste ${entry.manual} (hidden): `, true);
    const expiresOn = (await promptImpl('Expiry date shown by GitHub (YYYY-MM-DD): ')).trim();
    await pushTargets(entry, value, runImpl);
    return { key, expiresOn };
  }
  const tokens = await cf(token, '/user/tokens', { fetchImpl });
  const policies = await policiesFor(entry, { token, accountId, tokens, fetchImpl });
  const expiresOn = expiry(entry.days, now);
  const created = await cf(token, '/user/tokens', { method: 'POST', body: { name: entry.name, policies, expires_on: expiresOn }, fetchImpl });
  try {
    await pushTargets(entry, created.value, runImpl);
  } catch (err) {
    await cf(token, `/user/tokens/${created.id}`, { method: 'DELETE', fetchImpl });
    throw err;
  }
  for (const old of tokens.filter((t) => t.name === entry.name)) await cf(token, `/user/tokens/${old.id}`, { method: 'DELETE', fetchImpl });
  return { key, expiresOn };
}

async function prompt(question, hidden = false) {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (s) => { if (s.startsWith(question)) rl.output.write(question); };
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  if (hidden) process.stdout.write('\n');
  return answer.trim();
}

async function readRegistry() {
  try { return JSON.parse(await readFile(REGISTRY_FILE, 'utf8')); } catch { return {}; }
}

async function main([cmd, key]) {
  await mkdir(HOME_DIR, { recursive: true });
  if (cmd === 'setup') {
    const value = await prompt('Paste the bootstrap token tt-token-admin (hidden): ', true);
    await cf(value, '/user/tokens/verify');
    await writeFile(ADMIN_FILE, value, { mode: 0o600 });
    return console.log(`Saved to ${ADMIN_FILE}.`);
  }
  const token = (await readFile(ADMIN_FILE, 'utf8').catch(() => '')).trim();
  if (!token) throw new Error('no bootstrap token: run pnpm token:setup first');
  if (cmd === 'roll') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is not set');
    const { expiresOn } = await roll(key, { token, accountId });
    const registry = await readRegistry();
    registry[key] = { setOn: new Date().toISOString().slice(0, 10), expiresOn: expiresOn.slice(0, 10) };
    await writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2) + '\n');
    return console.log(`${key}: set, expires ${expiresOn.slice(0, 10)}.`);
  }
  if (cmd === 'list') {
    const rows = (await cf(token, '/user/tokens')).map((t) => [t.name, t.status, (t.expires_on || 'never').slice(0, 10)]);
    for (const [k, r] of Object.entries(await readRegistry())) rows.push([`${k} (registry)`, `set ${r.setOn}`, r.expiresOn]);
    rows.sort((a, b) => a[2].localeCompare(b[2]));
    return console.table(rows.map(([name, status, expires]) => ({ name, status, expires })));
  }
  throw new Error('usage: tokens.mjs setup | roll <name> | list');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => { console.error(err.message); process.exitCode = 1; });
}
