. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
Initialize-ToolingState
$node = Get-ProjectNode
$entry = Join-Path $root "node_modules\chrome-devtools-mcp\build\src\bin\chrome-devtools-mcp.js"
$log = Join-Path $root ".tooling\logs\chrome-devtools-mcp.log"
$env:CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS = "1"
Set-Location -LiteralPath $root
& $node $entry --isolated --no-usage-statistics --no-performance-crux --redact-network-headers --logFile $log
exit $LASTEXITCODE
