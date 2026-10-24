param(
  [switch]$SkipBrowsers,
  [ValidateSet("Python", "Node", "Skills")]
  [string[]]$Components
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")
$projectRoot = Get-ProjectRoot
$globalRoot = Get-GlobalToolingRoot
$pins = Get-Content -Raw (Join-Path $projectRoot "tooling-versions.json") | ConvertFrom-Json
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupRoot = Join-Path $globalRoot "backups\bootstrap-$stamp"
$stagingRoot = Join-Path $globalRoot "staging\bootstrap-$stamp"

if ([System.IO.Path]::GetFullPath($projectRoot) -ne "E:\TruongThinh-Website" -and -not (Test-Path -LiteralPath (Join-Path $projectRoot ".git"))) {
  throw "Bootstrap must run from a Git clone root: $projectRoot"
}
if ([System.IO.Path]::GetFullPath($globalRoot) -ne [System.IO.Path]::GetFullPath((Join-Path $env:USERPROFILE ".codex\tooling")) -and -not $env:CODEX_GLOBAL_TOOLING_ROOT) {
  throw "Unexpected global tooling root: $globalRoot"
}
New-Item -ItemType Directory -Force -Path $backupRoot,$stagingRoot,$globalRoot | Out-Null

function Write-Utf8Atomic([string]$Path, [string]$Content) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
  [System.IO.File]::WriteAllText($temporary, $Content, (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Backup-Path([string]$Path, [string]$Relative) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $destination = Join-Path $backupRoot $Relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath $Path -Destination $destination -Recurse -Force
}

foreach ($item in @(
  @{ path = (Join-Path $env:USERPROFILE ".codex\config.toml"); relative = "user\config.toml" },
  @{ path = (Join-Path $env:USERPROFILE ".codex\AGENTS.md"); relative = "user\AGENTS.md" },
  @{ path = (Join-Path $projectRoot ".codex\config.toml"); relative = "project\.codex\config.toml" },
  @{ path = (Join-Path $projectRoot "package.json"); relative = "project\package.json" },
  @{ path = (Join-Path $projectRoot "pnpm-lock.yaml"); relative = "project\pnpm-lock.yaml" }
)) { Backup-Path $item.path $item.relative }

function Install-GlobalPython {
  $python = Join-Path $globalRoot "python\Scripts\python.exe"
  if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    $base = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    if (-not (Test-Path -LiteralPath $base -PathType Leaf)) {
      $command = Get-Command python -ErrorAction SilentlyContinue
      if (-not $command) { throw "Python 3.12 is unavailable." }
      $base = $command.Source
    }
    & $base -m venv (Join-Path $globalRoot "python")
    if ($LASTEXITCODE -ne 0) { throw "Global Python environment creation failed." }
  }
  & $python -m pip install --disable-pip-version-check --upgrade "uv==$($pins.python.uv)" "graphifyy[$($pins.python.graphify_extras)]==$($pins.python.graphifyy)"
  if ($LASTEXITCODE -ne 0) { throw "Global Graphify installation failed." }

  & $python -m pip check
  if ($LASTEXITCODE -ne 0) { throw "Global Python dependency check failed." }
  & (Join-Path $PSScriptRoot "patch-graphify-query.ps1") -Python $python
}

function Install-GlobalNode {
  $nodeRoot = Join-Path $globalRoot "node"
  $package = [ordered]@{
    name = "codex-global-tooling"
    private = $true
    packageManager = "pnpm@$($pins.node.project.pnpm)"
    dependencies = [ordered]@{
      impeccable = [string]$pins.node.global.impeccable
    }
  }
  Write-Utf8Atomic (Join-Path $nodeRoot "package.json") (($package | ConvertTo-Json -Depth 5) + [Environment]::NewLine)
  # Impeccable 4 phát hành engine dưới dạng optional dependency theo platform.
  & (Get-ProjectPnpm) --dir $nodeRoot install --no-frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw "Global Node dependency installation failed." }
}

function Install-PnpmShim {
  $corepack = Get-Command corepack -ErrorAction SilentlyContinue
  if (-not $corepack) { throw "Corepack is required for pinned pnpm." }
  & $corepack.Source install --global "pnpm@$($pins.node.project.pnpm)"
  if ($LASTEXITCODE -ne 0) { throw "Pinned pnpm installation failed." }
  $shim = Join-Path $env:USERPROFILE ".codex\bin\pnpm.cmd"
  $content = @"
@echo off
"$($corepack.Source)" pnpm %*
"@
  Write-Utf8Atomic $shim ($content.TrimEnd() + [Environment]::NewLine)
}

function Install-GlobalSkills {
  # Skill của Claude Code đến từ plugin đã pin (local-setup.ps1), giống cloud-setup.sh.
  # Codex tự cài lại skill của nó khi cần; ở đây chỉ giữ skill Graphify.
  & (Join-Path $PSScriptRoot "local-setup.ps1")
  & (Join-Path $globalRoot "python\Scripts\graphify.exe") install --platform agents
  if ($LASTEXITCODE -ne 0) { throw "Graphify global skill installation failed." }
}

function Install-GlobalPersonas {
  $destination = Join-Path $env:USERPROFILE ".codex\agents"
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  $personas = [ordered]@{
    "code-reviewer.toml" = @'
name = "code-reviewer"
description = "Read-only Staff Engineer review across correctness, readability, architecture, security, performance, and test evidence."
sandbox_mode = "read-only"
developer_instructions = "Review only; never edit files. Prioritize real defects over style, cite exact evidence, and give a concrete fix for every critical or important finding."
'@
    "security-auditor.toml" = @'
name = "security-auditor"
description = "Read-only security auditor focused on exploitable findings, trust boundaries, supply chain, and actionable mitigations."
sandbox_mode = "read-only"
developer_instructions = "Audit only; never edit files. Start from trust boundaries, focus on practical exploitability, cite exact evidence, and provide a specific mitigation."
'@
    "test-engineer.toml" = @'
name = "test-engineer"
description = "Read-only QA specialist for test strategy, coverage gaps, edge cases, and Prove-It regression tests."
sandbox_mode = "read-only"
developer_instructions = "Analyze only; never edit files. Test public behavior at the lowest useful level and specify evidence-backed regression checks."
'@
    "web-performance-auditor.toml" = @'
name = "web-performance-auditor"
description = "Read-only web performance auditor for loading, rendering, network behavior, and evidence-backed Core Web Vitals analysis."
sandbox_mode = "read-only"
developer_instructions = "Audit only; never edit files. Label source findings as potential impact and accept metrics only from named runtime evidence."
'@
  }
  foreach ($entry in $personas.GetEnumerator()) {
    $path = Join-Path $destination $entry.Key
    if (Test-Path -LiteralPath $path) { Backup-Path $path "agents\$($entry.Key)" }
    Write-Utf8Atomic $path ($entry.Value.Trim() + [Environment]::NewLine)
  }
}

function Remove-TomlTree([string]$Text, [string]$Prefix) {
  $result = [System.Collections.Generic.List[string]]::new()
  $skip = $false
  foreach ($line in ($Text -split "`r?`n")) {
    if ($line.Trim() -match '^\[(.+)\]$') {
      $table = $Matches[1]
      $skip = $table -eq $Prefix -or $table.StartsWith("$Prefix.", [System.StringComparison]::Ordinal)
    }
    if (-not $skip) { $result.Add($line) }
  }
  return (($result -join [Environment]::NewLine).TrimEnd() + [Environment]::NewLine)
}

function Set-TomlKeys([string]$Text, [string]$Table, [System.Collections.IDictionary]$Values) {
  $lines = [System.Collections.Generic.List[string]]::new()
  foreach ($line in ($Text -split "`r?`n")) { $lines.Add($line) }
  $header = "[$Table]"
  $start = -1
  for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i].Trim() -eq $header) { $start = $i; break } }
  if ($start -lt 0) {
    if ($lines.Count -gt 0 -and $lines[$lines.Count - 1]) { $lines.Add("") }
    $lines.Add($header)
    foreach ($key in $Values.Keys) { $lines.Add("$key = $($Values[$key])") }
    return (($lines -join [Environment]::NewLine).TrimEnd() + [Environment]::NewLine)
  }
  $end = $lines.Count
  for ($i = $start + 1; $i -lt $lines.Count; $i++) { if ($lines[$i].Trim() -match '^\[.+\]$') { $end = $i; break } }
  foreach ($key in $Values.Keys) {
    $found = $false
    for ($i = $start + 1; $i -lt $end; $i++) {
      if ($lines[$i] -match "^\s*$([regex]::Escape([string]$key))\s*=") { $lines[$i] = "$key = $($Values[$key])"; $found = $true; break }
    }
    if (-not $found) { $lines.Insert($end, "$key = $($Values[$key])"); $end++ }
  }
  return (($lines -join [Environment]::NewLine).TrimEnd() + [Environment]::NewLine)
}

function Configure-Codex {
  $codexHome = Join-Path $env:USERPROFILE ".codex"
  $configPath = Join-Path $codexHome "config.toml"
  $text = if (Test-Path -LiteralPath $configPath) { Get-Content -Raw -LiteralPath $configPath } else { "" }
  foreach ($tree in @('hooks.state', 'marketplaces.ponytail', 'plugins."ponytail@ponytail"', 'mcp_servers.graphify', 'mcp_servers.chrome_devtools')) {
    $text = Remove-TomlTree $text $tree
  }
  $text = Set-TomlKeys $text "features" ([ordered]@{ hooks = "false"; multi_agent = "true" })
  $text = Set-TomlKeys $text "agents" ([ordered]@{ max_concurrent_threads_per_session = "4" })
  $wrapper = (Join-Path $globalRoot "bin\mcp.ps1").Replace("\", "\\")
  $mcp = @"

[mcp_servers.graphify]
command = "pwsh"
args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$wrapper", "graphify"]
startup_timeout_sec = 60
tool_timeout_sec = 120
enabled = true
required = true
"@
  Write-Utf8Atomic $configPath ($text.TrimEnd() + $mcp + [Environment]::NewLine)

  $agentsPath = Join-Path $codexHome "AGENTS.md"
  $existing = if (Test-Path -LiteralPath $agentsPath) { Get-Content -Raw -LiteralPath $agentsPath } else { "" }
  $block = @'
<!-- codex:global-stack:start -->
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
<!-- codex:global-stack:end -->
'@
  $pattern = '(?s)<!-- codex:global-stack:start -->.*?<!-- codex:global-stack:end -->'
  $updated = if ($existing -match $pattern) { [regex]::Replace($existing, $pattern, $block.Trim()) } else { $existing.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $block.Trim() }
  Write-Utf8Atomic $agentsPath ($updated.TrimEnd() + [Environment]::NewLine)
}

function Retire-ProjectPayloads {
  foreach ($relative in @(".agents\skills", ".codex\agents", ".tooling\python", ".tooling\runtimes", ".tooling\vendor")) {
    $source = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
    if (-not $source.StartsWith($projectRoot + "\", [System.StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe retirement target: $source" }
    if (-not (Test-Path -LiteralPath $source)) { continue }
    $destination = Join-Path $backupRoot "retired-project\$relative"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Move-Item -LiteralPath $source -Destination $destination
  }
}

$selectedComponents = @($Components | Sort-Object -Unique)
if ($selectedComponents.Count -gt 0) {
  foreach ($component in $selectedComponents) {
    switch ($component) {
      "Python" { Install-GlobalPython }
      "Node" { Install-GlobalNode }
      "Skills" { Install-GlobalSkills }
    }
  }
  Write-Output "Selected bootstrap components ready: $($selectedComponents -join ', ')"
  Write-Output "Backup: $backupRoot"
  return
}

Install-GlobalPython
Install-PnpmShim
Install-GlobalNode
Install-GlobalSkills
Install-GlobalPersonas
New-Item -ItemType Directory -Force -Path (Join-Path $globalRoot "bin"),(Join-Path $globalRoot "logs") | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "global-mcp.ps1") -Destination (Join-Path $globalRoot "bin\mcp.ps1") -Force
Configure-Codex
$graphifyPythonMarker = Join-Path $projectRoot "graphify-out\.graphify_python"
if (Test-Path -LiteralPath $graphifyPythonMarker -PathType Leaf) {
  Write-Utf8Atomic $graphifyPythonMarker ((Join-Path $globalRoot "python\Scripts\python.exe") + [Environment]::NewLine)
}

Use-ProjectToolPath
& (Get-ProjectPnpm) --dir $projectRoot install --frozen-lockfile --no-optional
if ($LASTEXITCODE -ne 0) { throw "Project pnpm install failed." }
if (-not $SkipBrowsers) {
  $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $projectRoot ".tooling\browsers"
  & (Get-ProjectNode) (Join-Path $projectRoot "node_modules\playwright\cli.js") install chromium firefox webkit
  if ($LASTEXITCODE -ne 0) { throw "Playwright browser installation failed." }
}

& (Join-Path $PSScriptRoot "graphify-git-hooks.ps1") -Action install
& (Join-Path $PSScriptRoot "ponytail-git-hooks.ps1") -Action install
Retire-ProjectPayloads
& (Join-Path $PSScriptRoot "doctor.ps1")
if ($LASTEXITCODE -ne 0) { throw "Tooling doctor failed; backup remains at $backupRoot" }

$manifest = [ordered]@{
  schema = 2
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  global_root = $globalRoot
  backup = $backupRoot
  versions = $pins
}
Write-Utf8Atomic (Join-Path $projectRoot ".tooling\state\install-manifest.json") (($manifest | ConvertTo-Json -Depth 12) + [Environment]::NewLine)
Write-Output "Global stack and project tooling ready."
Write-Output "Backup: $backupRoot"
