$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$freshnessScript = Join-Path $root "scripts\tooling\graphify-freshness.ps1"
$wrapper = Join-Path $root "scripts\tooling\invoke-graphify.ps1"

if (-not (Test-Path -LiteralPath $freshnessScript -PathType Leaf)) { throw "Graphify freshness module is missing." }
if (-not (Test-Path -LiteralPath $wrapper -PathType Leaf)) { throw "Graphify boundary wrapper is missing." }
foreach ($obsolete in @(".graphify-profile", "scripts\graphify-watch.ps1", "scripts\tooling\set-graphify-profile.ps1")) {
  if (Test-Path -LiteralPath (Join-Path $root $obsolete)) { throw "Obsolete Graphify profile/watch file remains: $obsolete" }
}
if (Test-Path -LiteralPath (Join-Path $root ".codex\skills\graphify")) { throw "Duplicate Codex Graphify skill remains." }

$dispatcher = Join-Path $root "scripts\tooling\hook-dispatch.ps1"
$dispatcherSource = Get-Content -Raw -LiteralPath $dispatcher
$wrapperSource = Get-Content -Raw -LiteralPath $wrapper
if ($dispatcherSource -notmatch 'graphify-freshness\.ps1') { throw "Hook dispatcher does not use the shared freshness gate." }
if ($dispatcherSource -match 'graphify-profile|needs_update|graphify-watch') { throw "Hook dispatcher still contains obsolete Graphify profile/watch/marker logic." }
if ($wrapperSource -notmatch 'Invoke-GraphUpdateIfNeeded') { throw "Graphify wrapper does not enforce AST freshness." }
if ($wrapperSource -notmatch 'Get-GraphifySemanticStatus') { throw "Graphify wrapper does not report semantic freshness at the boundary." }
foreach ($command in @("query", "path", "explain")) {
  if ($wrapperSource -notmatch [regex]::Escape('"' + $command + '"')) { throw "Graphify wrapper does not allow $command." }
}

$bootstrapSource = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\bootstrap.ps1")
if ($bootstrapSource -notmatch 'Move-Item\s+-LiteralPath\s+\$legacyGraphifySkill') { throw "Bootstrap does not move the Graphify skill into the portable project scope." }
if ($bootstrapSource -notmatch 'uninstall --project --platform codex') { throw "Bootstrap does not remove Graphify's duplicate Codex integration." }

. $freshnessScript
$semantic = Get-GraphifySemanticStatus
if ($semantic.PSObject.Properties.Name -notcontains "pending_count") { throw "Semantic status does not expose pending_count." }
if ($semantic.PSObject.Properties.Name -notcontains "pending_files") { throw "Semantic status does not expose pending_files." }
if (@($semantic.pending_files | Where-Object { $_ -match '\.(js|mjs|cjs|ps1|py|sql)$' }).Count -ne 0) {
  throw "Boundary semantic status must not treat AST-covered code as pending docs/media."
}

Write-Output "PASS Graphify freshness fixtures: shared gate, boundary wrapper, semantic status, obsolete profile/watch cleanup."
