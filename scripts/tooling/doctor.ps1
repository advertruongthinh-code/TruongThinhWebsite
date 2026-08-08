param(
  [switch]$Quick,
  [switch]$Mcp
)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
$failures = @()
$warnings = @()
$passes = @()

function Test-RequiredPath([string]$Relative, [string]$Label) {
  if (Test-Path -LiteralPath (Join-Path $root $Relative)) { $script:passes += $Label }
  else { $script:failures += "$Label missing: $Relative" }
}

foreach ($item in @(
  @{ path = ".tooling\python\Scripts\serena.exe"; label = "Serena" },
  @{ path = ".tooling\python\Scripts\graphify.exe"; label = "Graphify" },
  @{ path = ".tooling\runtimes\uv-0.12.3\uv.exe"; label = "uv 0.12.3" },
  @{ path = ".tooling\runtimes\uv-0.12.3\uvx.exe"; label = "uvx 0.12.3" },
  @{ path = ".tooling\runtimes\powershell-7.6.4\pwsh.exe"; label = "PowerShell 7.6.4" },
  @{ path = "node_modules\playwright\package.json"; label = "Playwright" },
  @{ path = "node_modules\impeccable\package.json"; label = "Impeccable CLI" },
  @{ path = "node_modules\chrome-devtools-mcp\package.json"; label = "Chrome DevTools MCP" },
  @{ path = "pnpm-lock.yaml"; label = "pnpm lockfile" },
  @{ path = ".codex\hooks.json"; label = "Codex hooks" },
  @{ path = ".codex\config.toml"; label = "Codex MCP config" }
)) { Test-RequiredPath $item.path $item.label }

$skillRoot = Join-Path $root ".agents\skills"
$skillCount = @(Get-ChildItem -LiteralPath $skillRoot -Directory -ErrorAction SilentlyContinue).Count
if ($skillCount -ge 32) { $passes += "Project skills ($skillCount)" } else { $failures += "Expected at least 32 project skills; found $skillCount" }
$missingPonytail = @(@(
  "ponytail", "ponytail-audit", "ponytail-debt", "ponytail-gain", "ponytail-help", "ponytail-review"
) | Where-Object { -not (Test-Path -LiteralPath (Join-Path $skillRoot "$_\SKILL.md") -PathType Leaf) })
if ($missingPonytail.Count -eq 0) { $passes += "Ponytail project skills (6)" }
else { $failures += "Missing Ponytail project skills: $($missingPonytail -join ', ')" }

$personaCount = @(Get-ChildItem -LiteralPath (Join-Path $root ".codex\agents") -Filter "*.toml" -File -ErrorAction SilentlyContinue).Count
if ($personaCount -eq 4) { $passes += "Read-only personas (4)" } else { $failures += "Expected 4 personas; found $personaCount" }

try {
  Get-Content -Raw (Join-Path $root ".codex\hooks.json") | ConvertFrom-Json | Out-Null
  $passes += "hooks.json parses"
} catch { $failures += "hooks.json invalid: $($_.Exception.Message)" }

try {
  & (Get-ProjectPython) -c "import tomllib, pathlib; tomllib.loads(pathlib.Path(r'$root/.codex/config.toml').read_text(encoding='utf-8')); print('ok')" | Out-Null
  if ($LASTEXITCODE -eq 0) { $passes += "config.toml parses" } else { $failures += "config.toml invalid" }
} catch { $failures += "config.toml invalid: $($_.Exception.Message)" }

try {
  Use-ProjectToolPath
  $syncRaw = & (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Check
  $sync = $syncRaw | ConvertFrom-Json
  if ($sync.changed) { $failures += "Serena languages are stale: $($sync.previous -join ', ') -> $($sync.languages -join ', ')" }
  else { $passes += "Serena languages synced: $($sync.languages -join ', ')" }
  if ($sync.unsupported_present.Count -gt 0) { $warnings += "Serena unsupported types present: $($sync.unsupported_present -join ', ')" }
  if ($sync.unknown_present.Count -gt 0) { $warnings += "Serena unknown extension mappings: $($sync.unknown_present -join ', ')" }
} catch { $failures += "Serena sync check failed: $($_.Exception.Message)" }

if (-not $Quick) { try {
  & (Get-ProjectPython) -m pip check | Out-Null
  if ($LASTEXITCODE -eq 0) { $passes += "Python dependency check" } else { $failures += "pip check failed" }
} catch { $failures += "pip check failed: $($_.Exception.Message)" } }

$browserRoot = Join-Path $root ".tooling\browsers"
if (-not $Quick) { foreach ($browser in @("chromium-*", "firefox-*", "webkit-*")) {
  if (Get-ChildItem -LiteralPath $browserRoot -Directory -Filter $browser -ErrorAction SilentlyContinue) { $passes += "Browser $browser" }
  else { $failures += "Browser payload missing: $browser" }
} }

if ($Mcp) {
  Use-ProjectToolPath
  foreach ($service in @("serena", "graphify", "chrome-devtools")) {
    try {
      $probe = & (Get-ProjectPython) (Join-Path $PSScriptRoot "mcp_probe.py") $service --root $root --timeout 90 2>&1 | Out-String
      if ($LASTEXITCODE -ne 0) { throw $probe.Trim() }
      $data = ($probe -split "`r?`n" | Where-Object { $_.Trim().StartsWith("{") } | Select-Object -Last 1) | ConvertFrom-Json
      $passes += "MCP $service ($($data.tools) tools)"
    } catch { $failures += "MCP $service probe failed: $($_.Exception.Message)" }
  }
}

$restart = Join-Path $root ".tooling\state\serena\restart-required.json"
if (Test-Path -LiteralPath $restart) { $warnings += "Serena MCP reactivation is required; remove the marker only after verified reconnect." }

Write-Output "PASS"
$passes | ForEach-Object { Write-Output "  + $_" }
if ($warnings.Count -gt 0) {
  Write-Output "WARN"
  $warnings | ForEach-Object { Write-Output "  ! $_" }
}
if ($failures.Count -gt 0) {
  Write-Output "FAIL"
  $failures | ForEach-Object { Write-Output "  - $_" }
  exit 1
}
exit 0
