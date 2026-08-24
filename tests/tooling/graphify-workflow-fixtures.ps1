$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$pwsh = (Get-Command pwsh -ErrorAction Stop).Source

foreach ($obsolete in @(
  ".codex\hooks.json",
  "scripts\tooling\hook-dispatch.ps1",
  "scripts\tooling\hooks.template.json",
  "tests\tooling\hook-fixtures.ps1"
)) {
  if (Test-Path -LiteralPath (Join-Path $root $obsolete)) {
    throw "Custom Codex lifecycle hook artifact remains: $obsolete"
  }
}

$hookManager = Join-Path $root "scripts\tooling\graphify-git-hooks.ps1"
$watcher = Join-Path $root "scripts\tooling\watch-graphify.ps1"
$tasksPath = Join-Path $root ".vscode\tasks.json"
$runbookPath = Join-Path $root "docs\operations\graphify.md"
$freshnessPath = Join-Path $root "scripts\tooling\graphify-freshness.ps1"
$supplementalHelper = Join-Path $root "scripts\tooling\graphify_supplemental.py"
$supplementalList = Join-Path $root "scripts\tooling\graphify-supplemental-files.txt"
foreach ($required in @($hookManager, $watcher, $tasksPath, $runbookPath, $freshnessPath, $supplementalHelper, $supplementalList)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Graphify workflow file missing: $required" }
}

$hookManagerSource = Get-Content -Raw -LiteralPath $hookManager
if ($hookManagerSource -notmatch 'ValidateSet\("install",\s*"status",\s*"uninstall"\)') {
  throw "Graphify Git hook manager does not expose the official lifecycle actions."
}
if ($hookManagerSource -notmatch 'Get-GraphifyExe' -or $hookManagerSource -notmatch 'hook\s+\$Action') {
  throw "Graphify Git hook manager does not delegate to the pinned global CLI."
}

$watcherSource = Get-Content -Raw -LiteralPath $watcher
if ($watcherSource -notmatch 'Get-GraphifyExe' -or $watcherSource -notmatch 'watch\s+\$root') {
  throw "Graphify watcher does not run the official project-root watch command."
}

$tasks = Get-Content -Raw -LiteralPath $tasksPath | ConvertFrom-Json
$watchTask = @($tasks.tasks | Where-Object { $_.label -eq "Graphify: Watch" }) | Select-Object -First 1
if (-not $watchTask) { throw "VS Code task Graphify: Watch is missing." }
if (-not $watchTask.isBackground) { throw "VS Code Graphify watcher task must stay in the background." }
if ((@($watchTask.args) -join " ") -notmatch 'watch-graphify\.ps1') {
  throw "VS Code Graphify watcher task does not call the shared terminal wrapper."
}

$runbook = Get-Content -Raw -LiteralPath $runbookPath
foreach ($needle in @("graphify-git-hooks.ps1", "watch-graphify.ps1", "Graphify: Watch", "Ctrl+C")) {
  if ($runbook -notmatch [regex]::Escape($needle)) { throw "Graphify runbook is missing: $needle" }
}

$bootstrap = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\bootstrap.ps1")
if ($bootstrap -notmatch 'install --platform agents') {
  throw "Bootstrap does not install the user-global Graphify skill."
}
if ($bootstrap -match 'install --project|install --platform codex|hooks\.template|providers=codex') {
  throw "Bootstrap can recreate a removed Codex lifecycle hook."
}
if ($bootstrap -notmatch 'graphify-git-hooks\.ps1') {
  throw "Bootstrap does not install Graphify's managed Git hooks."
}

$freshnessSource = Get-Content -Raw -LiteralPath $freshnessPath
if ($freshnessSource -notmatch 'Invoke-GraphifySupplementalRestore' -or $freshnessSource -notmatch 'graphify_supplemental\.py') {
  throw "Graphify query boundary does not restore zero-AST semantic content."
}
if ($freshnessSource -notmatch '\$sourceKey\s*=.*(?s).*Get-GraphCorpusFingerprint') {
  throw "Graphify semantic-status cache key does not track corpus changes."
}
$supplementalFiles = @(Get-Content -LiteralPath $supplementalList | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") })
$expectedSupplemental = @(".vscode/tasks.json", "scripts/tooling/serena-language-map.json", "tooling-versions.json")
if ((Compare-Object $expectedSupplemental $supplementalFiles).Count -ne 0) {
  throw "Graphify supplemental allowlist is not the verified three-file set."
}

$status = & $pwsh -NoProfile -ExecutionPolicy Bypass -File $hookManager -Action status 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { throw "Graphify hook status failed: $($status.Trim())" }
foreach ($expected in @("post-commit: installed", "post-checkout: installed", "merge driver: registered")) {
  if ($status -notmatch [regex]::Escape($expected)) { throw "Graphify hook status missing '$expected': $($status.Trim())" }
}

Write-Output "PASS Graphify workflow fixtures: no Codex lifecycle hooks, official Git hooks, shared watcher, supplemental restore guard, VS Code task, terminal runbook."
