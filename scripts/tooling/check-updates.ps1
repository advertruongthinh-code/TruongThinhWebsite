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

function Read-RemoteVersion([string]$Name, [scriptblock]$Fetch, [string]$Current, [string]$Channel) {
  try {
    $latest = [string](& $Fetch)
    $script:results[$Name] = [ordered]@{
      channel = $Channel
      current = $Current
      latest = $latest
      update_available = $latest -ne $Current
    }
  } catch { $script:errors += "$Name`: $($_.Exception.Message)" }
}

Read-RemoteVersion "serena-agent" { (Invoke-RestMethod "https://pypi.org/pypi/serena-agent/json").info.version } $pins.python.'serena-agent' "stable-package"
Read-RemoteVersion "graphifyy" { (Invoke-RestMethod "https://pypi.org/pypi/graphifyy/json").info.version } $pins.python.graphifyy "stable-package"
Read-RemoteVersion "uv" { (Invoke-RestMethod "https://pypi.org/pypi/uv/json").info.version } $pins.python.uv "stable-package"
Read-RemoteVersion "playwright" { (Invoke-RestMethod "https://registry.npmjs.org/playwright/latest").version } $pins.node.project.playwright "stable-package"
Read-RemoteVersion "impeccable" { (Invoke-RestMethod "https://registry.npmjs.org/impeccable/latest").version } $pins.node.global.impeccable "stable-package"
Read-RemoteVersion "chrome-devtools-mcp" { (Invoke-RestMethod "https://registry.npmjs.org/chrome-devtools-mcp/latest").version } $pins.node.global.'chrome-devtools-mcp' "stable-package"
Read-RemoteVersion "pnpm" { (Invoke-RestMethod "https://registry.npmjs.org/pnpm/latest").version } $pins.node.project.pnpm "stable-package"
Read-RemoteVersion "jq" {
  $refs = & git ls-remote --quiet --tags --refs "https://github.com/jqlang/jq.git" "refs/tags/jq-*" 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($refs | Out-String).Trim() }
  $versions = @($refs | ForEach-Object {
    if ($_ -match 'refs/tags/jq-(?<version>\d+\.\d+\.\d+)$') { [version]$Matches.version }
  })
  if (-not $versions.Count) { throw "No stable jq-X.Y.Z tags were returned." }
  [string]($versions | Sort-Object | Select-Object -Last 1)
} $pins.runtimes.jq.version "stable-release"

foreach ($repo in $pins.repositories.PSObject.Properties.Name) {
  $url = [string]$pins.repository_urls.$repo
  Read-RemoteVersion $repo {
    $head = & git ls-remote --quiet $url HEAD 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($head | Out-String).Trim() }
    $sha = [string](@($head)[0] -split '\s+')[0]
    if ($sha -notmatch '^[0-9a-f]{40}$') { throw "Invalid HEAD response from $url" }
    $sha
  } ([string]$pins.repositories.$repo) "repository-head"
}

$payload = [ordered]@{
  checked_at = (Get-Date).ToUniversalTime().ToString("o")
  policy = "notify-only"
  results = $results
  errors = $errors
}
[System.IO.File]::WriteAllText($statePath, (($payload | ConvertTo-Json -Depth 8) + [Environment]::NewLine))

$updates = @($results.GetEnumerator() | Where-Object { $_.Value.update_available })
if ($updates.Count) {
  Write-Output "Tooling updates available; nothing was changed:"
  foreach ($update in $updates) { Write-Output "- $($update.Key) [$($update.Value.channel)]: $($update.Value.current) -> $($update.Value.latest)" }
}
if ($errors.Count -and -not $IfDue) { Write-Warning ($errors -join "; ") }
