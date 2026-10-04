#!/bin/bash
# Setup script for the Claude Code cloud environment ("Default" at claude.ai/code).
# Installs the owner's global agent stack for every cloud session and every repo:
# agent-skills, caveman, ponytail, impeccable, i-have-adhd, graphify, serena.
#
# Plugins load as skills-directory plugins (~/.claude/skills/<name>/ with
# .claude-plugin/plugin.json): Claude Code loads them every session without
# settings.json. MCP servers and extra hooks live in the local "cloud-stack" plugin.
# Pins mirror tooling-versions.json. Always exits 0 so a failed install never
# blocks the session; read /opt/agent-tools/setup.log for the per-item result.
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
"$T/src/impeccable/plugin/skills/impeccable/scripts/impeccable" engine-probe
"$BIN/serena" init </dev/null >/dev/null
"$BIN/graphify" install </dev/null

# One Chromium for impeccable, caveman-browse and chrome-devtools; root needs --no-sandbox.
cat > /usr/local/bin/chromium <<'EOF'
#!/bin/sh
exec /opt/pw-browsers/chromium --no-sandbox "$@"
EOF
chmod +x /usr/local/bin/chromium

# Always-on modes, mirroring the local global rules (ADHD, Caveman ultra, Ponytail ultra).
# Delete a line to make that mode on-demand.
touch "$CFG/.i-have-adhd-always"
mkdir -p "$HOME/.config/caveman" "$HOME/.config/ponytail"
echo '{"defaultMode": "ultracave"}' > "$HOME/.config/caveman/config.json"
echo '{"defaultMode": "ultra"}' > "$HOME/.config/ponytail/config.json"

# Local plugin: MCP servers, plus hooks the upstream plugins leave unwired.
P="$T/cloud-stack"
mkdir -p "$P/.claude-plugin" "$P/hooks"
cat > "$P/.claude-plugin/plugin.json" <<'EOF'
{"name": "cloud-stack", "version": "1.0.0",
 "description": "MCP servers and hooks for the owner's agent stack in cloud sessions"}
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
A="$T/src/agent-skills/hooks"
cat > "$P/hooks/hooks.json" <<EOF
{"hooks": {
  "SessionStart": [{"hooks": [{"type": "command", "command": "$BIN/serena-hooks activate --client=claude-code"}]}],
  "SessionEnd": [{"hooks": [{"type": "command", "command": "$BIN/serena-hooks cleanup --client=claude-code"}]}],
  "PreToolUse": [
    {"hooks": [{"type": "command", "command": "$BIN/serena-hooks remind --client=claude-code"}]},
    {"matcher": "mcp__.*serena.*", "hooks": [{"type": "command", "command": "$BIN/serena-hooks auto-approve --client=claude-code"}]},
    {"matcher": "Bash|Grep", "hooks": [{"type": "command", "command": "$BIN/graphify hook-guard search", "timeout": 10}]},
    {"matcher": "Read|Glob", "hooks": [{"type": "command", "command": "$BIN/graphify hook-guard read", "timeout": 10}]},
    {"matcher": "WebFetch", "hooks": [{"type": "command", "command": "bash $A/sdd-cache-pre.sh", "timeout": 10}]},
    {"matcher": "Read", "hooks": [{"type": "command", "command": "bash $A/simplify-ignore.sh"}]}
  ],
  "PostToolUse": [
    {"matcher": "WebFetch", "hooks": [{"type": "command", "command": "bash $A/sdd-cache-post.sh", "async": true, "timeout": 10}]},
    {"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "bash $A/simplify-ignore.sh"}]}
  ],
  "Stop": [{"hooks": [{"type": "command", "command": "bash $A/simplify-ignore.sh"}]}]
}}
EOF

ln -sfnT "$T/src/agent-skills" "$CFG/skills/agent-skills"
ln -sfnT "$T/src/caveman" "$CFG/skills/caveman"
ln -sfnT "$T/src/ponytail" "$CFG/skills/ponytail"
ln -sfnT "$T/src/impeccable/plugin" "$CFG/skills/impeccable"
ln -sfnT "$T/src/i-have-adhd" "$CFG/skills/i-have-adhd"
ln -sfnT "$P" "$CFG/skills/cloud-stack"

for f in "$CFG"/skills/{agent-skills,caveman,ponytail,impeccable,i-have-adhd,cloud-stack}/.claude-plugin/plugin.json \
  "$CFG/skills/graphify/SKILL.md" "$BIN"/{graphify,graphify-mcp,serena,serena-hooks} \
  "$HOME"/.caveman/bin/{caveman-mcp,caveman-browse,cavemem} \
  "$T/src/ponytail/ponytail-mcp/node_modules" "$HOME/.impeccable/bin"; do
  [ -e "$f" ] && echo "OK   $f" || echo "FAIL $f"
done
for c in caveman impeccable chrome-devtools-mcp; do
  command -v "$c" >/dev/null && echo "OK   $c" || echo "FAIL $c"
done
exit 0
