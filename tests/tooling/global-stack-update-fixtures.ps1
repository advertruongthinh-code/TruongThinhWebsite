$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path

$pins = Get-Content -Raw -LiteralPath (Join-Path $root "tooling-versions.json") | ConvertFrom-Json
if ($pins.python.'serena-agent' -ne "1.7.0") { throw "Serena pin is stale." }
if ($pins.python.graphifyy -ne "0.9.74") { throw "Graphify pin is stale." }
if ($pins.python.uv -ne "0.12.22") { throw "uv pin is stale." }
if ($pins.node.global.impeccable -ne "4.1.0") { throw "Impeccable CLI pin is stale." }
if ($pins.node.global.'chrome-devtools-mcp' -ne "1.10.1") { throw "Chrome DevTools MCP pin is stale." }
if ($pins.node.project.pnpm -ne "12.8.1") { throw "pnpm pin is stale." }
if ($pins.skills.'caveman-count' -ne 22) { throw "Caveman skill count is stale." }
if ($pins.skills.'impeccable-skill' -ne "4.5.0") { throw "Impeccable skill pin is stale." }
if ($pins.skills.'global-total' -ne 56) { throw "Managed global skill total is stale." }
if ($pins.scope.global -contains 'superpowers' -or $pins.repositories.PSObject.Properties.Name -contains 'obra/superpowers') { throw "Retired Superpowers source remains pinned." }
if ($pins.repositories.'addyosmani/agent-skills' -ne "a06bc63b3f8b829c14b0bbf53d99fefc39d58092") { throw "Agent Skills pin is stale." }
if ($pins.runtimes.PSObject.Properties.Name -contains "bun") { throw "Retired Bun runtime remains pinned." }
if ($pins.runtimes.jq.version -ne "1.8.2") { throw "jq verifier pin is stale." }

$bootstrap = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\bootstrap.ps1")
if ($bootstrap -notmatch 'managed-skills\.json') { throw "Bootstrap does not track managed skills." }
if ($bootstrap -notmatch 'SKILL\.md') { throw "Bootstrap does not filter skill directories by payload." }
if ($bootstrap -notmatch 'using-agent-skills' -or $bootstrap -notmatch 'host agent, Claude Code or Codex chooses native' -or $bootstrap -notmatch 'main agent retains' -or $bootstrap -match 'subagent-driven-development') { throw "Bootstrap does not install the clean native Agent Skills routing rule." }

$globalMcp = Get-Content -Raw -LiteralPath (Join-Path $root "scripts\tooling\global-mcp.ps1")
if ($globalMcp -notmatch 'python\\Scripts.*\$env:PATH') { throw "Global MCP launcher does not expose uv/uvx from Python Scripts." }

Write-Output "PASS global stack update fixtures: current pins, managed-skill receipt, host-native Agent Skills routing."
