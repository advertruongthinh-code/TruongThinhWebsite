. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
Set-Location -LiteralPath $root
& (Get-ProjectPython) -m graphify.serve (Join-Path $root "graphify-out\graph.json")
exit $LASTEXITCODE
