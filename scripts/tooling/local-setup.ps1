# Local counterpart of cloud-setup.sh for Claude Code skills: installs the pinned
# agent-skills, caveman, ponytail, impeccable and i-have-adhd plugins into
# ~/.claude/skills as skills-directory plugins, with the same owner rules:
# no lifecycle hooks, i-have-adhd self-invokes, caveman skills are user-invoked only.
# MCP servers stay with bootstrap.ps1. Run once per machine, then restart Claude Code:
#   pwsh -NoProfile -File scripts/tooling/local-setup.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pins = (Get-Content -Raw (Join-Path $PSScriptRoot "..\..\tooling-versions.json") | ConvertFrom-Json).repositories
$cfg = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$src = Join-Path $cfg "agent-tools/src"
New-Item -ItemType Directory -Force -Path (Join-Path $cfg "skills"), $src | Out-Null
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Edit-Text([string]$Path, [scriptblock]$Change) {
  $text = [System.IO.File]::ReadAllText($Path) -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($Path, (& $Change $text), $utf8)
}

$plugins = [ordered]@{
  "agent-skills" = "addyosmani/agent-skills"
  "caveman"      = "juliusbrussee/caveman"
  "ponytail"     = "dietrichgebert/ponytail"
  "impeccable"   = "pbakaus/impeccable"
  "i-have-adhd"  = "ayghri/i-have-adhd"
}
foreach ($name in $plugins.Keys) {
  $repo = $plugins[$name]
  $dir = Join-Path $src $name
  if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
  git init -q $dir
  git -C $dir fetch -q --depth 1 "https://github.com/$repo.git" $pins.$repo
  if ($LASTEXITCODE -ne 0) { throw "Fetch failed: $repo" }
  git -C $dir checkout -q FETCH_HEAD
  $root = if ($name -eq "impeccable") { Join-Path $dir "plugin" } else { $dir }

  # Strip hooks: default hooks/hooks.json plus the manifest key (hooks/ stays for ponytail-mcp).
  Remove-Item -LiteralPath (Join-Path $root "hooks/hooks.json") -Force -ErrorAction SilentlyContinue
  $manifest = Join-Path $root ".claude-plugin/plugin.json"
  $json = Get-Content -Raw $manifest | ConvertFrom-Json
  $json.PSObject.Properties.Remove("hooks")
  [System.IO.File]::WriteAllText($manifest, ($json | ConvertTo-Json -Depth 20), $utf8)

  $link = Join-Path $cfg "skills/$name"
  $existing = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
  if ($existing -and -not $existing.LinkType) { throw "Refusing to replace a real folder: $link" }
  if ($existing) { $existing.Delete() }
  New-Item -ItemType ($IsWindows ? "Junction" : "SymbolicLink") -Path $link -Target $root | Out-Null
}

Edit-Text (Join-Path $src "i-have-adhd/skills/i-have-adhd/SKILL.md") {
  param($t) ($t -replace "(?m)^disable-model-invocation:.*\n", "").Replace(
    "Invoke with /i-have-adhd;", "Use for every response to the owner, or on /i-have-adhd;")
}
foreach ($skill in Get-ChildItem (Join-Path $src "caveman/skills/*/SKILL.md")) {
  Edit-Text $skill.FullName {
    param($t) if ($t -match "(?m)^disable-model-invocation:") { $t } else { $t -replace "^---\n", "---`ndisable-model-invocation: true`n" }
  }
}

foreach ($name in $plugins.Keys) {
  $ok = Test-Path -LiteralPath (Join-Path $cfg "skills/$name/.claude-plugin/plugin.json")
  "{0} {1}" -f ($ok ? "OK  " : "FAIL"), $name
}
