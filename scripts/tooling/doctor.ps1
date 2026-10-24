param(
  [switch]$Quick,
  [switch]$Mcp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "graphify-freshness.ps1")

$root = Get-ProjectRoot
$global = Get-GlobalToolingRoot
$failures = @()
$warnings = @()
$passes = @()

function Test-RequiredPath([string]$Path, [string]$Label) {
  if (Test-Path -LiteralPath $Path) { $script:passes += $Label }
  else { $script:failures += "$Label missing: $Path" }
}

foreach ($item in @(
  @{ path = (Join-Path $global "python\Scripts\graphify.exe"); label = "Graphify user-global" },
  @{ path = (Join-Path $global "node\node_modules\impeccable\package.json"); label = "Impeccable CLI user-global" },
  @{ path = (Join-Path $global "bin\mcp.ps1"); label = "Global MCP launcher" },
  @{ path = (Join-Path $root "scripts\tooling\invoke-graphify.ps1"); label = "Graphify boundary wrapper" },
  @{ path = (Join-Path $root "scripts\tooling\graphify_supplemental.py"); label = "Graphify supplemental restore" },
  @{ path = (Join-Path $root "scripts\tooling\graphify-supplemental-files.txt"); label = "Graphify supplemental allowlist" },
  @{ path = (Join-Path $root "scripts\tooling\graphify-git-hooks.ps1"); label = "Graphify Git hook wrapper" },
  @{ path = (Join-Path $root "scripts\tooling\ponytail-git-hooks.ps1"); label = "Ponytail Git hook wrapper" },
  @{ path = (Join-Path $root "scripts\tooling\watch-graphify.ps1"); label = "Graphify watcher wrapper" },
  @{ path = (Join-Path $root ".vscode\tasks.json"); label = "VS Code tooling tasks" },
  @{ path = (Join-Path $root "docs\operations\TOOLING.md"); label = "Tooling runbook" },
  @{ path = (Join-Path $root "node_modules\playwright\package.json"); label = "Playwright project-local" },
  @{ path = (Join-Path $root "pnpm-lock.yaml"); label = "pnpm lockfile" }
)) { Test-RequiredPath $item.path $item.label }

$graphifyPythonMarker = Join-Path $root "graphify-out\.graphify_python"
if (Test-Path -LiteralPath $graphifyPythonMarker -PathType Leaf) {
  $expectedPython = [System.IO.Path]::GetFullPath((Join-Path $global "python\Scripts\python.exe"))
  $actualPython = [System.IO.Path]::GetFullPath((Get-Content -Raw -LiteralPath $graphifyPythonMarker).Trim())
  if ([string]::Equals($actualPython, $expectedPython, [System.StringComparison]::OrdinalIgnoreCase)) { $passes += "Graphify generated interpreter uses global Python" }
  else { $failures += "Graphify generated interpreter is stale: $actualPython" }
}

foreach ($obsolete in @(
  ".agents\skills",
  ".codex\agents",
  ".codex\hooks.json",
  "scripts\tooling\hook-dispatch.ps1",
  "scripts\tooling\hooks.template.json",
  ".tooling\python",
  ".tooling\runtimes",
  ".tooling\vendor"
)) {
  if (Test-Path -LiteralPath (Join-Path $root $obsolete)) { $failures += "Project-local payload remains: $obsolete" }
}

$pluginRoot = Join-Path $env:USERPROFILE ".claude\skills"
$missingPlugins = @("agent-skills", "caveman", "ponytail", "impeccable", "i-have-adhd" | Where-Object {
  -not (Test-Path -LiteralPath (Join-Path $pluginRoot "$_\.claude-plugin\plugin.json") -PathType Leaf)
})
if ($missingPlugins.Count -eq 0) { $passes += "Claude skill plugins installed" }
else { $failures += "Missing Claude skill plugins: $($missingPlugins -join ', '); run scripts/tooling/local-setup.ps1" }

try {
  $globalRules = Get-Content -Raw -LiteralPath (Join-Path $env:USERPROFILE ".codex\AGENTS.md")
  $projectRules = @(
    Get-Content -Raw -LiteralPath (Join-Path $root "AGENTS.md")
    Get-Content -Raw -LiteralPath (Join-Path $root "docs\operations\agent-rule-workflow-tools.md")
    Get-Content -Raw -LiteralPath (Join-Path $root "docs\operations\agent-rule-evidence-qa-handoff.md")
  ) -join [Environment]::NewLine
  $bootstrapRules = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\bootstrap.ps1")
  foreach ($entry in @(
    @{ label = "global"; text = $globalRules },
    @{ label = "project"; text = $projectRules },
    @{ label = "bootstrap"; text = $bootstrapRules }
  )) {
    if ($entry.text -match 'subagent-driven-development' -or $entry.text -notmatch 'callable') { throw "$($entry.label) native capability-based orchestration rule is missing or stale" }
    if ($entry.text -match 'Route every semantic task.*gpt-5\.6-luna|Semantic task.*`gpt-5\.6-luna`') { throw "$($entry.label) obsolete blanket semantic pin remains" }
    if ($entry.text -notmatch 'primary\s+official\s+source' -or $entry.text -notmatch '(?:unsupported\s+guess|guess\s+(?:là|as)\s+fact)') { throw "$($entry.label) evidence rule is missing" }
    if ($entry.text -notmatch '(?:semantic\s+index\s+only\s+when\s+the\s+user\s+explicitly\s+requests|Chỉ\s+build/update\s+Graphify\s+semantic\s+index\s+khi\s+user\s+explicit\s+request)') { throw "$($entry.label) opt-in semantic build rule is missing" }
  }
  foreach ($entry in @(
    @{ label = "global"; text = $globalRules },
    @{ label = "bootstrap"; text = $bootstrapRules }
  )) {
    if ($entry.text -notmatch 'using-agent-skills' -or $entry.text -notmatch 'Codex\s+chooses\s+native' -or $entry.text -notmatch 'main\s+agent\s+retains') { throw "$($entry.label) Codex native Agent Skills rule is missing" }
    if ($entry.text -notmatch 'Caveman\s+skills\s+run\s+only\s+when\s+the\s+user\s+invokes' -or $entry.text -notmatch 'ponytail`?\s+in\s+ultra\s+mode') { throw "$($entry.label) Caveman user-invoked/Ponytail ultra rule is missing" }
  }
  $passes += "Capability-based orchestration, explicit-request, and evidence rules"
  $passes += "Codex native Agent Skills routing and ultra modes"
} catch { $failures += "Agent rules invalid: $($_.Exception.Message)" }

$globalAgents = Join-Path $env:USERPROFILE ".codex\agents"
$basePersonas = @("code-reviewer.toml", "security-auditor.toml", "test-engineer.toml", "web-performance-auditor.toml")
$missingPersonas = @($basePersonas | Where-Object { -not (Test-Path -LiteralPath (Join-Path $globalAgents $_) -PathType Leaf) })
if ($missingPersonas.Count -eq 0) { $passes += "User-global base personas (4)" }
else { $failures += "Missing user-global personas: $($missingPersonas -join ', ')" }
$globalConfig = Join-Path $env:USERPROFILE ".codex\config.toml"
try {
  $configText = Get-Content -Raw -LiteralPath $globalConfig
  if ($configText -notmatch '(?ms)^\[features\]\s*(?:(?!^\[).)*^hooks\s*=\s*false\s*$') { throw "features.hooks is not false" }
  if ($configText -match '(?m)^\[hooks\.state') { throw "stale hooks.state remains" }
  if ($configText -match 'ponytail@ponytail|marketplaces\.ponytail') { throw "Ponytail plugin remains enabled" }
  foreach ($server in @("graphify")) {
    if ($configText -notmatch "(?ms)^\[mcp_servers\.$server\]\s*(?:(?!^\[).)*^required\s*=\s*true\s*$") { throw "$server is not required" }
  }
  $passes += "Global hooks disabled and required MCP policy"
} catch { $failures += "Global Codex config invalid: $($_.Exception.Message)" }

try {
  $projectConfig = Get-Content -Raw -LiteralPath (Join-Path $root ".codex\config.toml")
  if ($projectConfig -match '(?m)^\[(mcp_servers|hooks|agents|features)') { throw "project config overrides the global stack" }
  $passes += "Project Codex config inherits global stack"
} catch { $failures += "Project Codex config invalid: $($_.Exception.Message)" }

try {
  $pluginRaw = (& codex plugin list --json 2>&1 | Out-String)
  $plugins = $pluginRaw.Substring($pluginRaw.IndexOf("{"), $pluginRaw.LastIndexOf("}") - $pluginRaw.IndexOf("{") + 1) | ConvertFrom-Json
  if (@($plugins.installed | Where-Object { $_.pluginId -eq "ponytail@ponytail" }).Count) { throw "Ponytail plugin is still installed" }
  $passes += "Plugin scope: Ponytail skill-only"
} catch { $failures += "Plugin verification failed: $($_.Exception.Message)" }

try {
  $hookStatus = & (Join-Path $PSScriptRoot "graphify-git-hooks.ps1") -Action status 2>&1 | Out-String
  foreach ($expected in @("post-commit: installed", "post-checkout: installed", "merge driver: registered")) {
    if ($hookStatus -notmatch [regex]::Escape($expected)) { throw "Missing '$expected'" }
  }
  $passes += "Graphify Git hooks and merge driver"
} catch { $failures += "Graphify Git hooks invalid: $($_.Exception.Message)" }

if (-not $Quick) {
  & (Get-ProjectPython) -m pip check | Out-Null
  if ($LASTEXITCODE -eq 0) { $passes += "Global Python dependency check" } else { $failures += "Global pip check failed" }
  $browserRoot = Join-Path $root ".tooling\browsers"
  foreach ($browser in @("chromium-*", "firefox-*", "webkit-*")) {
    if (Get-ChildItem -LiteralPath $browserRoot -Directory -Filter $browser -ErrorAction SilentlyContinue) { $passes += "Browser $browser" }
    else { $failures += "Browser payload missing: $browser" }
  }
}

if ($Mcp) {
  foreach ($service in @("graphify")) {
    try {
      $probe = & (Get-ProjectPython) (Join-Path $PSScriptRoot "mcp_probe.py") $service --root $root --timeout 90 2>&1 | Out-String
      if ($LASTEXITCODE -ne 0) { throw $probe.Trim() }
      $data = ($probe -split "`r?`n" | Where-Object { $_.Trim().StartsWith("{") } | Select-Object -Last 1) | ConvertFrom-Json
      $passes += "MCP $service ($($data.tools) tools)"
    } catch { $failures += "MCP $service probe failed: $($_.Exception.Message)" }
  }
}

try {
  $supplemental = Invoke-GraphifySupplementalRestore "Doctor" -CheckOnly
  if ($supplemental.fresh) { $passes += "Graphify supplemental content coverage (3/3)" }
  elseif ($supplemental.status -in @("missing", "stale-cache")) { $warnings += "$($supplemental.message) AST remains valid." }
  else { $failures += $supplemental.message }
} catch { $failures += "Graphify supplemental coverage check failed: $($_.Exception.Message)" }
try {
  $semantic = Get-GraphifySemanticStatus
  if (-not $semantic.available) { $warnings += "Graphify semantic freshness unavailable: $($semantic.error)" }
  elseif ([int]$semantic.pending_count -gt 0) { $warnings += "Graphify semantic update required for $($semantic.pending_count) non-code files; AST remains valid." }
  else { $passes += "Graphify semantic content fresh" }
} catch { $warnings += "Graphify semantic freshness check failed: $($_.Exception.Message)" }

Write-Output "PASS"
$passes | ForEach-Object { Write-Output "  + $_" }
if ($warnings.Count) { Write-Output "WARN"; $warnings | ForEach-Object { Write-Output "  ! $_" } }
if ($failures.Count) { Write-Output "FAIL"; $failures | ForEach-Object { Write-Output "  - $_" }; exit 1 }
exit 0
