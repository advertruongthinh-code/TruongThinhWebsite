#!/bin/bash
# Setup script cho môi trường cloud của Claude Code ("Default" tại claude.ai/code).
# Cài global agent stack của owner cho mọi cloud session và mọi repo:
# agent-skills, caveman, ponytail, impeccable, i-have-adhd, graphify.
# Ponytail 5 bỏ ponytail-mcp; rule ultra nạp qua CLAUDE.md và skill.
#
# Rule của owner: chỉ skill, command, agent và MCP, không bao giờ dùng agent lifecycle hook.
# Mỗi plugin nạp dưới dạng skills-directory plugin (~/.claude/skills/<name>/ cùng
# .claude-plugin/plugin.json) liên kết tới checkout đã pin, đã gỡ hook.
# MCP server nằm trong plugin local "cloud-stack". Pin khớp với tooling-versions.json.
# Luôn exit 0 để cài lỗi không chặn session; xem
# /opt/agent-tools/setup.log để biết kết quả từng mục.
set -uo pipefail

CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
T="${AGENT_TOOLS_DIR:-/opt/agent-tools}"
BIN="$HOME/.local/bin"
mkdir -p "$T/src" "$CFG/skills"
# Redirect file thường: với `exec > >(tee ...)`, lệnh `wait` trần cũng chờ tee và bị deadlock.
exec >"$T/setup.log" 2>&1 </dev/null
export DO_NOT_TRACK=1 CAVEMAN_TELEMETRY=0 GIT_TERMINAL_PROMPT=0

fetch() { # <owner/repo> <sha>: checkout nông (shallow) của một commit đã pin
  local d="$T/src/${1#*/}"
  rm -rf "$d" && git init -q "$d" &&
    git -C "$d" fetch -q --depth 1 "https://github.com/$1.git" "$2" &&
    git -C "$d" checkout -q FETCH_HEAD
}

fetch addyosmani/agent-skills aeac41d4d005999432bb7312f7ff06383a91d59d &
fetch juliusbrussee/caveman a5705b01a5d877c34d44c4961f14816b21bfb72a &
fetch dietrichgebert/ponytail 16352ac229eb08a9598dcae48fe9f2b342567d86 &
fetch pbakaus/impeccable 8a0e198da34ebc5b936a9d5975fb7a3b1cf353b7 &
fetch ayghri/i-have-adhd 1ecea1993b7fce257ffbd686c070948b5e07eda6 &
uv tool install -q --python 3.13 "graphifyy[all]==0.9.92" &
npm install -g --silent --no-audit --no-fund \
  @caveman-ai/cli@4.0.1 impeccable@4.6.0 &
wait

# Binary đi kèm và runtime cache. Không bao giờ chạy `caveman enable`/`caveman claude`:
# chúng đổi hướng ANTHROPIC_BASE_URL qua proxy local và làm hỏng cloud session.
caveman telemetry off >/dev/null
caveman setup --install </dev/null
# Ẩn npm CLI để launcher cache engine đã pin của skill (engine 0.1.15).
PATH=/usr/bin:/bin "$T/src/impeccable/plugin/skills/impeccable/scripts/impeccable" engine-probe

# Global rules: bản sao của block codex:global-stack trong scripts/tooling/bootstrap.ps1
# (Claude local import qua ~/.claude/CLAUDE.md). tests/tooling/global-rules-sync.test.mjs
# làm CI fail khi hai bản lệch nhau hoặc check của doctor.ps1 không còn khớp.
cat > "$CFG/CLAUDE.md" <<'EOF'
## Global agent stack

Apply these rules in the main agent and every coordinator, explorer, worker, reviewer, and subagent.

1. Always load `ponytail` in ultra mode; it controls implementation minimalism. The `i-have-adhd` skill self-invokes to shape actionable structure. Caveman skills run only when the user invokes them; never self-invoke them. A closer project `AGENTS.md` may explicitly disable Caveman.
2. For codebase or project-content exploration, query Graphify first for architecture, relationships, cross-document links, and blast radius; then use `rg` for exact symbols and references. Graphify includes meaningful text, PDF, and Office content but excludes media and generated/vendor state.
3. For visible UI changes, load `impeccable` and run `impeccable detect`. These integrations use skills/rules only; never install agent lifecycle hooks.
4. Start every task with `using-agent-skills` and load only matching skills. Skills define workflow and gates while the host agent, Claude Code or Codex chooses native solo, worker, or reviewer execution. The main agent retains intent, architecture, diff inspection, verification, and final acceptance; personas do not invoke personas.
5. For approved execution plans, assess ambiguity, scope, risk and verifiability, then choose direct execution or host-native collaboration when tools are callable and ownership is clear. Main may implement small, clear, low-risk tasks. Choose model/effort from callable host capabilities to minimize total effort to acceptance; lower routes require more specific briefs. Apply the same routing to semantic tasks. Specify model/effort when allowed; record requested and observed effective values, or unknown. Never use a separate user-visible task to bypass native capability limits.
6. Build or update the Graphify semantic index only when the user explicitly requests it. Otherwise report pending semantic files and do not spawn extraction workers, merge chunks, or write semantic cache or manifest state; structural AST refresh may still run through approved wrappers and watchers.
7. Verify information, knowledge, and decisions against local evidence and primary official sources. Mark every inference explicitly, re-check unstable facts, and never present an unsupported guess as fact.
8. Each time a skill is used, whether self-selected, user-invoked with `/`, or loaded mid-task, first write one chat line: `Skill: <name> (<self|user>): <reason>`.
EOF
"$BIN/graphify" install </dev/null  # skill cùng block đăng ký được nối vào CLAUDE.md

# Một Chromium cho impeccable và caveman-browse; root cần --no-sandbox.
cat > /usr/local/bin/chromium <<'EOF'
#!/bin/sh
exec /opt/pw-browsers/chromium --no-sandbox "$@"
EOF
chmod +x /usr/local/bin/chromium

# Gỡ hook tại chỗ: bỏ hooks/hooks.json mặc định và key `hooks` trong manifest.
# Giữ nguyên phần còn lại của hooks/. Thư mục component là symlink bị
# từ chối với lỗi "path escapes plugin directory", nên link chính root của checkout.
unhook() { # <checkout> <name>
  local m="$1/.claude-plugin/plugin.json"
  rm -f "$1/hooks/hooks.json"
  jq 'del(.hooks)' "$m" > "$m.tmp" && mv "$m.tmp" "$m"
  ln -sfnT "$1" "$CFG/skills/$2"
}
unhook "$T/src/agent-skills" agent-skills
unhook "$T/src/caveman" caveman
unhook "$T/src/ponytail" ponytail
unhook "$T/src/impeccable/plugin" impeccable
unhook "$T/src/i-have-adhd" i-have-adhd
# Owner chọn: i-have-adhd tự gọi (giống local-setup.ps1).
sed -i -e '/^disable-model-invocation:/d' \
  -e 's|Invoke with /i-have-adhd;|Use for every response to the owner, or on /i-have-adhd;|' \
  "$T/src/i-have-adhd/skills/i-have-adhd/SKILL.md"
# Owner chọn: skill caveman chỉ chạy khi user gọi (giống local-setup.ps1).
for f in "$T"/src/caveman/skills/*/SKILL.md; do
  grep -q '^disable-model-invocation:' "$f" || sed -i '1a disable-model-invocation: true' "$f"
done

# Plugin local chứa các MCP server.
P="$T/cloud-stack"
mkdir -p "$P/.claude-plugin"
cat > "$P/.claude-plugin/plugin.json" <<'EOF'
{"name": "cloud-stack", "version": "1.1.0",
 "description": "MCP servers for the owner's agent stack in cloud sessions"}
EOF
cat > "$P/.mcp.json" <<EOF
{"mcpServers": {
  "graphify": {"command": "$BIN/graphify-mcp"},
  "caveman": {"command": "$HOME/.caveman/bin/caveman-mcp"},
  "caveman-browse": {"command": "$HOME/.caveman/bin/caveman-browse"},
  "cavemem": {"command": "$HOME/.caveman/bin/cavemem"}
}}
EOF
ln -sfnT "$P" "$CFG/skills/cloud-stack"

for f in "$CFG"/skills/{agent-skills,caveman,ponytail,impeccable,i-have-adhd,cloud-stack}/.claude-plugin/plugin.json \
  "$CFG/skills/graphify/SKILL.md" "$CFG/CLAUDE.md" "$BIN"/{graphify,graphify-mcp} \
  "$HOME"/.caveman/bin/{caveman-mcp,caveman-browse,cavemem} \
  "$HOME/.impeccable/bin"; do
  [ -e "$f" ] && echo "OK   $f" || echo "FAIL $f"
done
for c in caveman impeccable; do
  command -v "$c" >/dev/null && echo "OK   $c" || echo "FAIL $c"
done
grep -l '"hooks"' "$CFG"/skills/*/.claude-plugin/plugin.json && echo "FAIL hooks in a manifest"
ls "$CFG"/skills/*/hooks/hooks.json 2>/dev/null && echo "FAIL default hooks.json left"
exit 0
