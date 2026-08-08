param([switch]$IfDue)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
Initialize-ToolingState
$statePath = Join-Path $root ".tooling\state\update-check.json"

if ($IfDue -and (Test-Path -LiteralPath $statePath)) {
  try {
    $state = Get-Content -Raw $statePath | ConvertFrom-Json
    if ((Get-Date) - ([datetime]$state.checked_at) -lt [timespan]::FromHours(24)) { exit 0 }
  } catch {}
}

$pins = Get-Content -Raw (Join-Path $root "tooling-versions.json") | ConvertFrom-Json
$results = [ordered]@{}
$errors = @()

function Read-RemoteVersion([string]$Name, [scriptblock]$Fetch, [string]$Current) {
  try {
    $latest = & $Fetch
    $script:results[$Name] = [ordered]@{
      current = $Current
      latest = [string]$latest
      update_available = ([string]$latest -ne $Current)
    }
  } catch { $script:errors += "$Name`: $($_.Exception.Message)" }
}

Read-RemoteVersion "serena-agent" { (Invoke-RestMethod "https://pypi.org/pypi/serena-agent/json").info.version } $pins.python.'serena-agent'
Read-RemoteVersion "graphifyy" { (Invoke-RestMethod "https://pypi.org/pypi/graphifyy/json").info.version } $pins.python.graphifyy
Read-RemoteVersion "playwright" { (Invoke-RestMethod "https://registry.npmjs.org/playwright/latest").version } $pins.node.playwright
Read-RemoteVersion "impeccable" { (Invoke-RestMethod "https://registry.npmjs.org/impeccable/latest").version } $pins.node.impeccable
Read-RemoteVersion "chrome-devtools-mcp" { (Invoke-RestMethod "https://registry.npmjs.org/chrome-devtools-mcp/latest").version } $pins.node.'chrome-devtools-mcp'
Read-RemoteVersion "npm" { (Invoke-RestMethod "https://registry.npmjs.org/npm/latest").version } $pins.node.npm
Read-RemoteVersion "wrangler" { (Invoke-RestMethod "https://registry.npmjs.org/wrangler/latest").version } $pins.node.wrangler
Read-RemoteVersion "uv" { (Invoke-RestMethod "https://api.github.com/repos/astral-sh/uv/releases/latest").tag_name.TrimStart("v") } $pins.runtimes.uv.version
Read-RemoteVersion "powershell" { (Invoke-RestMethod "https://api.github.com/repos/PowerShell/PowerShell/releases/latest").tag_name.TrimStart("v") } $pins.runtimes.powershell.version

$repoRefs = [ordered]@{
  "oraios/serena" = "main"
  "Graphify-Labs/graphify" = "main"
  "addyosmani/agent-skills" = "main"
  "pbakaus/impeccable" = "main"
  "dietrichgebert/ponytail" = "main"
}
foreach ($entry in $repoRefs.GetEnumerator()) {
  $repo = $entry.Key
  $ref = $entry.Value
  Read-RemoteVersion $repo { (Invoke-RestMethod "https://api.github.com/repos/$repo/commits/$ref").sha } $pins.repositories.$repo
}

$payload = [ordered]@{
  checked_at = (Get-Date).ToUniversalTime().ToString("o")
  policy = "notify-only"
  results = $results
  errors = $errors
}
[System.IO.File]::WriteAllText($statePath, (($payload | ConvertTo-Json -Depth 8) + [Environment]::NewLine))

$updates = @($results.GetEnumerator() | Where-Object { $_.Value.update_available })
if ($updates.Count -gt 0) {
  Write-Output "Tooling updates available; no packages were changed:"
  foreach ($update in $updates) {
    Write-Output "- $($update.Key): $($update.Value.current) -> $($update.Value.latest)"
  }
}
if ($errors.Count -gt 0 -and -not $IfDue) { Write-Warning ($errors -join "; ") }
