. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
Initialize-ToolingState
Use-ProjectToolPath
$env:SERENA_HOME = Join-Path (Get-GlobalToolingRoot) "state\serena\home"
$env:SERENA_EXE = Get-SerenaExe
& (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Apply -SkipHealthCheck | Out-Null
Set-Location -LiteralPath $root
& $env:SERENA_EXE start-mcp-server --transport stdio --context codex --project-from-cwd --enable-web-dashboard false --open-web-dashboard false
exit $LASTEXITCODE
