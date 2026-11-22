#!/usr/bin/env node
// Agent pre-tool guard (AGENTS.md SSoT, owner 2026-11-21): blocks reading secret files and history-destroying Git
// commands before the agent runs them. Best effort only: a script that opens a secret by itself is not seen here;
// the qa:docs secret checks are the gate. Reads the hook payload on stdin and answers in the caller's format:
// Claude Code (tool_name/tool_input: exit 2 with the reason on stderr) or Antigravity (toolCall.args: JSON decision).
import { pathToFileURL } from 'node:url';

// Secret file names; scripts/docs/agents-rules.mjs reuses this for the tracked-file check.
export const SECRET_FILE = /(^|[\\/])(\.env(?!\.example$)[^\\/]*|\.dev\.vars[^\\/]*|id_(rsa|ed25519|ecdsa)[^\\/]*|[^\\/]+\.(keytab|pem|key|p12|pfx|sqlite3?|db))$/i;
const SECRET_WORD = /(^|[\s"'=:\\/(])(\.env(?!\.example\b)(\.[\w-]+)*|\.dev\.vars(\.[\w-]+)*|[\w.-]*\.(keytab|pem|p12|pfx)|id_(rsa|ed25519|ecdsa)\w*)(?=$|[\s"';|&)<>])/i;
const COMMAND_RULES = [
  [/\bgit\s+push\b[^\n]*\s(--force(-with-lease)?|-f)(\s|=|$)/, 'force-push rewrites pushed history'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards work'],
  [/\s--no-verify\b/, '--no-verify skips the Git hooks'],
  [SECRET_WORD, 'the command names a secret file (.env, .dev.vars, keytab, private key)'],
];

export function verdict(payload) {
  const input = payload?.tool_input ?? payload?.toolCall?.args ?? {};
  const command = String(input.command ?? input.CommandLine ?? '');
  const paths = [input.file_path, input.path, input.notebook_path].filter(Boolean).map(String);
  const hit = COMMAND_RULES.find(([re]) => re.test(command));
  if (hit) return `Blocked: ${hit[1]}. Ask the owner if this is really needed.`;
  if (paths.some((p) => SECRET_FILE.test(p))) return 'Blocked: secret files are never read by agents. Ask the owner if this is really needed.';
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let payload = null;
  try { payload = JSON.parse(raw || 'null'); } catch { /* unreadable payload: allow */ }
  const reason = verdict(payload);
  if (payload?.toolCall) {
    process.stdout.write(JSON.stringify(reason ? { decision: 'deny', reason } : { decision: 'allow' }));
  } else if (reason) {
    process.stderr.write(reason);
    process.exitCode = 2;
  }
}
