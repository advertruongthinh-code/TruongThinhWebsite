param(
  [ValidateSet("install", "status", "uninstall")]
  [string]$Action = "status"
)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
$env:GIT_CONFIG_COUNT = "1"
$env:GIT_CONFIG_KEY_0 = "safe.directory"
$env:GIT_CONFIG_VALUE_0 = $root.Replace("\", "/")

& (Get-GraphifyExe) hook $Action
if ($LASTEXITCODE -ne 0) { throw "Graphify hook $Action failed with exit code $LASTEXITCODE." }
