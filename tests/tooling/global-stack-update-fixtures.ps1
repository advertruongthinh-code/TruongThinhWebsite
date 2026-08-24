$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path

$pins = Get-Content -Raw -LiteralPath (Join-Path $root "tooling-versions.json") | ConvertFrom-Json
if ($pins.python.'serena-agent' -ne "1.7.0") { throw "Serena pin is stale." }
if ($pins.python.graphifyy -ne "0.9.46") { throw "Graphify pin is stale." }
if ($pins.python.uv -ne "0.12.5") { throw "uv pin is stale." }
if ($pins.node.global.impeccable -ne "3.6.0") { throw "Impeccable CLI pin is stale." }
if ($pins.node.global.'chrome-devtools-mcp' -ne "1.7.0") { throw "Chrome DevTools MCP pin is stale." }
if ($pins.node.project.wrangler -ne "4.124.0") { throw "Wrangler pin is stale." }
if ($pins.node.project.pnpm -ne "11.22.0") { throw "pnpm pin is stale." }
if ($pins.skills.'caveman-count' -ne 20) { throw "Caveman skill count is stale." }
if ($pins.skills.'impeccable-skill' -ne "4.1.1") { throw "Impeccable skill pin is stale." }
if ($pins.skills.'global-total' -ne 53) { throw "Managed global skill total is stale." }
if ($pins.sol_advisor.version -ne "0.6.0") { throw "Sol Advisor pin is stale." }
if ($pins.runtimes.PSObject.Properties.Name -contains "bun") { throw "Retired Bun runtime remains pinned." }
if ($pins.runtimes.jq.version -ne "1.8.2") { throw "jq verifier pin is stale." }

$bootstrap = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\bootstrap.ps1")
if ($bootstrap -notmatch 'managed-skills\.json') { throw "Bootstrap does not track managed skills." }
if ($bootstrap -notmatch 'SKILL\.md') { throw "Bootstrap does not filter skill directories by payload." }

$globalMcp = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\global-mcp.ps1")
if ($globalMcp -notmatch 'python\\Scripts.*\$env:PATH') { throw "Global MCP launcher does not expose uv/uvx from Python Scripts." }

$solInstaller = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\install-sol-advisor.ps1")
foreach ($retired in @("bunPin", "mcp\\server.ts", "sol-advisor-windows.patch", "sol-advisor-windows-smoke.ts")) {
  if ($solInstaller -match [regex]::Escape($retired)) { throw "Sol Advisor installer retains retired 0.5 path: $retired" }
}
foreach ($required in @("install-agents.sh", "verify.sh")) {
  if ($solInstaller -notmatch [regex]::Escape($required)) { throw "Sol Advisor 0.6 installer is missing: $required" }
}
foreach ($required in @("Install-Jq", "Install-Python3Shim", "Install-ShasumShim", "winsymlinks:nativestrict")) {
  if ($solInstaller -notmatch [regex]::Escape($required)) { throw "Sol Advisor Windows verifier support is missing: $required" }
}

Write-Output "PASS global stack update fixtures: current pins, managed-skill receipt, Sol Advisor 0.6 native routing."
