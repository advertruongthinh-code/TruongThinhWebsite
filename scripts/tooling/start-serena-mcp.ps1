. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
Initialize-ToolingState
Use-ProjectToolPath
$env:SERENA_HOME = Join-Path $root ".tooling\state\serena\home"
& (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Apply -SkipHealthCheck | Out-Null
Set-Location -LiteralPath $root
& (Get-SerenaExe) start-mcp-server --transport stdio --context codex --project $root --enable-web-dashboard false --open-web-dashboard false
exit $LASTEXITCODE
