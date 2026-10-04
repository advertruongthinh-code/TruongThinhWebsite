#!/bin/bash
# Setup script for the Claude Code cloud environment ("Default" at claude.ai/code).
# Installs the owner's global agent stack for every cloud session and every repo:
# agent-skills, caveman, ponytail, impeccable, i-have-adhd, graphify, serena.
#
# Owner rule: skills, commands, agents and MCP only, never agent lifecycle hooks.
# Each plugin loads as a skills-directory plugin (~/.claude/skills/<name>/ with
# .claude-plugin/plugin.json) that links the pinned checkout minus its hooks.
# MCP servers live in the local "cloud-stack" plugin. Pins mirror tooling-versions.json.
# Always exits 0 so a failed install never blocks the session; read
# /opt/agent-tools/setup.log for the per-item result.
set -uo pipefail

CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
T="${AGENT_TOOLS_DIR:-/opt/agent-tools}"
BIN="$HOME/.local/bin"
mkdir -p "$T/src" "$CFG/skills"
# Plain file redirect: with `exec > >(tee ...)`, a bare `wait` also waits for tee and deadlocks.
exec >"$T/setup.log" 2>&1 </dev/null
export DO_NOT_TRACK=1 CAVEMAN_TELEMETRY=0 GIT_TERMINAL_PROMPT=0

fetch() { # <owner/repo> <sha>: shallow checkout of one pinned commit
  local d="$T/src/${1#*/}"
  rm -rf "$d" && git init -q "$d" &&
    git -C "$d" fetch -q --depth 1 "https://github.com/$1.git" "$2" &&
    git -C "$d" checkout -q FETCH_HEAD
}

fetch addyosmani/agent-skills a06bc63b3f8b829c14b0bbf53d99fefc39d58092 &
fetch juliusbrussee/caveman aeb45e2f787c0757a8af383a291a280cb6aeb4c1 &
fetch dietrichgebert/ponytail c982cd411abb53323c4baa1baa3c2f020b8d0b08 &
fetch pbakaus/impeccable e103efe779e2dd01274dabae83531fef00bf2563 &
fetch ayghri/i-have-adhd 839872f9d1cd634fed642b4589ce7226199cc15f &
uv tool install -q --python 3.13 "graphifyy[all]==0.9.74" &
uv tool install -q --python 3.13 "serena-agent==1.7.0" &
npm install -g --silent --no-audit --no-fund \
  @caveman-ai/cli@2.0.1 impeccable@4.1.0 chrome-devtools-mcp@1.10.1 &
wait

# Companion binaries and runtime caches. Never run `caveman enable`/`caveman claude`:
# they reroute ANTHROPIC_BASE_URL through a local proxy and break the cloud session.
caveman telemetry off >/dev/null
caveman setup --install </dev/null
(cd "$T/src/ponytail/ponytail-mcp" && npm install --silent --no-audit --no-fund --omit=dev)
# Hide the npm CLI (engine 0.1.5) so the launcher caches the skill's pinned engine.
PATH=/usr/bin:/bin "$T/src/impeccable/plugin/skills/impeccable/scripts/impeccable" engine-probe
"$BIN/serena" init </dev/null >/dev/null

# Global rules: mirror of the codex:global-stack block in scripts/tooling/bootstrap.ps1
# (local Claude imports it through ~/.claude/CLAUDE.md). Keep both in sync.
cat > "$CFG/CLAUDE.md" <<'EOF'
## Global agent stack

Apply these rules in the main agent and every coordinator, explorer, worker, reviewer, and subagent.

1. Always load `i-have-adhd`, `caveman` in ultra mode, and `ponytail` in ultra mode. ADHD controls actionable structure, Caveman controls terse prose, and Ponytail controls implementation minimalism. A closer project `AGENTS.md` may explicitly disable Caveman.
2. For codebase or project-content exploration, query Graphify first for architecture, relationships, cross-document links, and blast radius; then use Serena for exact symbols, references, diagnostics, and refactors. Graphify includes meaningful text, PDF, and Office content but excludes media and generated/vendor state.
3. Serena is required per task/session with `--project-from-cwd` and the host context (`codex` or `claude-code`); synchronize language servers from actual project extensions instead of editing the language list manually.
4. For visible UI changes, load `impeccable` and run `impeccable detect`. These integrations use skills/rules only; never install agent lifecycle hooks.
5. Start every task with `using-agent-skills` and load only matching skills. Skills define workflow and gates while the host agent, Claude Code or Codex chooses native solo, worker, or reviewer execution. The main agent retains intent, architecture, diff inspection, verification, and final acceptance; personas do not invoke personas.
6. For approved execution plans, assess ambiguity, scope, risk and verifiability, then choose direct execution or host-native collaboration when tools are callable and ownership is clear. Main may implement small, clear, low-risk tasks. Choose model/effort from callable host capabilities to minimize total effort to acceptance; lower routes require more specific briefs. Apply the same routing to semantic tasks. Specify model/effort when allowed; record requested and observed effective values, or unknown. Never use a separate user-visible task to bypass native capability limits.
7. Build or update the Graphify semantic index only when the user explicitly requests it. Otherwise report pending semantic files and do not spawn extraction workers, merge chunks, or write semantic cache or manifest state; structural AST refresh may still run through approved wrappers and watchers.
8. Verify information, knowledge, and decisions against local evidence and primary official sources. Mark every inference explicitly, re-check unstable facts, and never present an unsupported guess as fact.
EOF
"$BIN/graphify" install </dev/null  # skill plus its registration block appended to CLAUDE.md

# One Chromium for impeccable, caveman-browse and chrome-devtools; root needs --no-sandbox.
cat > /usr/local/bin/chromium <<'EOF'
#!/bin/sh
exec /opt/pw-browsers/chromium --no-sandbox "$@"
EOF
chmod +x /usr/local/bin/chromium

wrap() { # <checkout> <name>: plugin linking every entry except hooks, manifest without hooks
  local w="$T/plugins/$2" e
  mkdir -p "$w/.claude-plugin"
  for e in "$1"/* "$1"/.claude; do
    [ -e "$e" ] && [ "${e##*/}" != hooks ] && ln -sfn "$e" "$w/${e##*/}"
  done
  jq 'del(.hooks)' "$1/.claude-plugin/plugin.json" > "$w/.claude-plugin/plugin.json"
  ln -sfnT "$w" "$CFG/skills/$2"
}
wrap "$T/src/agent-skills" agent-skills
wrap "$T/src/caveman" caveman
wrap "$T/src/ponytail" ponytail
wrap "$T/src/impeccable/plugin" impeccable
wrap "$T/src/i-have-adhd" i-have-adhd

# Local plugin carrying the MCP servers.
P="$T/cloud-stack"
mkdir -p "$P/.claude-plugin"
cat > "$P/.claude-plugin/plugin.json" <<'EOF'
{"name": "cloud-stack", "version": "1.1.0",
 "description": "MCP servers for the owner's agent stack in cloud sessions"}
EOF
cat > "$P/.mcp.json" <<EOF
{"mcpServers": {
  "serena": {"command": "$BIN/serena", "args": ["start-mcp-server", "--context", "claude-code",
    "--project-from-cwd", "--enable-web-dashboard", "false", "--open-web-dashboard", "false"]},
  "graphify": {"command": "$BIN/graphify-mcp"},
  "ponytail": {"command": "node", "args": ["$T/src/ponytail/ponytail-mcp/index.js"]},
  "chrome-devtools": {"command": "chrome-devtools-mcp", "args": ["--headless", "--isolated",
    "--executablePath", "/usr/local/bin/chromium", "--no-usage-statistics",
    "--no-performance-crux", "--redact-network-headers"]},
  "caveman": {"command": "$HOME/.caveman/bin/caveman-mcp"},
  "caveman-browse": {"command": "$HOME/.caveman/bin/caveman-browse"},
  "cavemem": {"command": "$HOME/.caveman/bin/cavemem"}
}}
EOF
ln -sfnT "$P" "$CFG/skills/cloud-stack"

for f in "$CFG"/skills/{agent-skills,caveman,ponytail,impeccable,i-have-adhd,cloud-stack}/.claude-plugin/plugin.json \
  "$CFG/skills/graphify/SKILL.md" "$CFG/CLAUDE.md" "$BIN"/{graphify,graphify-mcp,serena} \
  "$HOME"/.caveman/bin/{caveman-mcp,caveman-browse,cavemem} \
  "$T/src/ponytail/ponytail-mcp/node_modules" "$HOME/.impeccable/bin"; do
  [ -e "$f" ] && echo "OK   $f" || echo "FAIL $f"
done
for c in caveman impeccable chrome-devtools-mcp; do
  command -v "$c" >/dev/null && echo "OK   $c" || echo "FAIL $c"
done
grep -l '"hooks"' "$CFG"/skills/*/.claude-plugin/plugin.json && echo "FAIL hooks in a manifest"
exit 0
