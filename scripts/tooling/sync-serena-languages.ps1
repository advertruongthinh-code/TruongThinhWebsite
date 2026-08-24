[CmdletBinding(DefaultParameterSetName = "Apply")]
param(
  [Parameter(ParameterSetName = "Check")][switch]$Check,
  [Parameter(ParameterSetName = "Apply")][switch]$Apply,
  [Parameter(ParameterSetName = "Watch")][switch]$Watch,
  [switch]$SkipHealthCheck
)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
Use-ProjectToolPath
$python = Get-ProjectPython
$env:SERENA_EXE = Get-SerenaExe
$script = Join-Path $PSScriptRoot "serena_sync.py"
$arguments = @($script, "--root", $root)

if ($Watch) {
  $arguments += @("--watch", "--debounce", "1.0")
} elseif (-not $Check) {
  $arguments += "--apply"
  if (-not $SkipHealthCheck) { $arguments += "--health-check" }
}

& $python @arguments
exit $LASTEXITCODE
