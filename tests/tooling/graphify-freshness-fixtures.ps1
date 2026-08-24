$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$freshnessScript = Join-Path $root "scripts\tooling\graphify-freshness.ps1"
$wrapper = Join-Path $root "scripts\tooling\invoke-graphify.ps1"

if (-not (Test-Path -LiteralPath $freshnessScript -PathType Leaf)) { throw "Graphify freshness module is missing." }
if (-not (Test-Path -LiteralPath $wrapper -PathType Leaf)) { throw "Graphify boundary wrapper is missing." }
foreach ($obsolete in @(".graphify-profile", "scripts\graphify-watch.ps1", "scripts\tooling\set-graphify-profile.ps1")) {
  if (Test-Path -LiteralPath (Join-Path $root $obsolete)) { throw "Obsolete Graphify profile/watch file remains: $obsolete" }
}
if (Test-Path -LiteralPath (Join-Path $root ".agents\skills")) { throw "Project-local skills remain after global migration." }

$wrapperSource = Get-Content -Raw -LiteralPath $wrapper
$freshnessSource = Get-Content -Raw -LiteralPath $freshnessScript
if ($wrapperSource -notmatch 'Invoke-GraphUpdateIfNeeded') { throw "Graphify wrapper does not enforce AST freshness." }
if ($wrapperSource -notmatch 'Get-GraphifySemanticStatus') { throw "Graphify wrapper does not report semantic freshness at the boundary." }
if ($freshnessSource -notmatch '(?s)stale-cache.*fresh\s*=\s*\$true') { throw "Stale supplemental semantic cache still blocks structurally fresh queries." }
foreach ($command in @("query", "path", "explain")) {
  if ($wrapperSource -notmatch [regex]::Escape('"' + $command + '"')) { throw "Graphify wrapper does not allow $command." }
}

$bootstrapSource = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\bootstrap.ps1")
if ($bootstrapSource -notmatch 'install --platform agents') { throw "Bootstrap does not install Graphify at user scope." }
if ($bootstrapSource -match 'install --project|install --platform codex') { throw "Bootstrap still installs project-local or Codex lifecycle Graphify integration." }

. $freshnessScript
$semantic = Get-GraphifySemanticStatus
if ($semantic.PSObject.Properties.Name -notcontains "pending_count") { throw "Semantic status does not expose pending_count." }
if ($semantic.PSObject.Properties.Name -notcontains "pending_files") { throw "Semantic status does not expose pending_files." }
if (@($semantic.pending_files | Where-Object { $_ -match '\.(js|mjs|cjs|ps1|py|sql)$' }).Count -ne 0) {
  throw "Boundary semantic status must not treat AST-covered code as pending docs/media."
}

Write-Output "PASS Graphify freshness fixtures: boundary wrapper, semantic status, global skill install, obsolete profile cleanup."
