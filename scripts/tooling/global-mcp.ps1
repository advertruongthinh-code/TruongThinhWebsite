param(
  [Parameter(Mandatory)]
  [ValidateSet("graphify")]
  [string]$Service
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$toolRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $toolRoot "python\Scripts\python.exe"
$env:PATH = "$(Join-Path $toolRoot 'python\Scripts');$(Join-Path $toolRoot 'bin');$env:PATH"
$projectRoot = (& git -C (Get-Location).Path rev-parse --show-toplevel 2>$null | Select-Object -First 1)
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }
$projectRoot = [System.IO.Path]::GetFullPath($projectRoot.Trim())
Set-Location -LiteralPath $projectRoot

switch ($Service) {
  "graphify" {
    & $python -m graphify.serve
    exit $LASTEXITCODE
  }
}
