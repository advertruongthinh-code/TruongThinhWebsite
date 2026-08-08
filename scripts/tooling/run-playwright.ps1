param(
  [ValidateSet("full", "smoke")]
  [string]$Suite = "full"
)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
$node = Get-ProjectNode
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $root ".tooling\browsers"
Set-Location -LiteralPath $root
if ($Suite -eq "full") {
  & $node (Join-Path $root "tests\site.e2e.cjs")
} else {
  if (-not $env:PLAYWRIGHT_OUTPUT_DIR) {
    $env:PLAYWRIGHT_OUTPUT_DIR = Join-Path $env:TEMP "truong-thinh-playwright-smoke"
  }
  & $node (Join-Path $root "node_modules\playwright\cli.js") test tests/cross-browser.smoke.spec.cjs
}
exit $LASTEXITCODE
