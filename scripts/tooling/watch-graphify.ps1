. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
$env:GIT_CONFIG_COUNT = "1"
$env:GIT_CONFIG_KEY_0 = "safe.directory"
$env:GIT_CONFIG_VALUE_0 = $root.Replace("\", "/")

Write-Output "Watching $root with Graphify. Press Ctrl+C to stop."
& (Get-GraphifyExe) watch $root
if ($LASTEXITCODE -ne 0) { throw "Graphify watcher failed with exit code $LASTEXITCODE." }
