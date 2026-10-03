param(
  [switch]$SkipAstRefresh,

  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("query", "path", "explain")]
  [string]$Command,

  [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "graphify-freshness.ps1")
Initialize-ToolingState

if ($SkipAstRefresh) {
  $graphPath = Join-Path (Get-ProjectRoot) "graphify-out\graph.json"
  if (-not (Test-Path -LiteralPath $graphPath -PathType Leaf)) {
    [Console]::Error.WriteLine("Graphify AST refresh was skipped, but graphify-out\graph.json is missing. Run the watcher or retry without -SkipAstRefresh.")
    exit 1
  }
  [Console]::Error.WriteLine("Graphify boundary notice: AST refresh skipped; querying the existing watcher-owned graph.")
} else {
  $freshness = Invoke-GraphUpdateIfNeeded -EventLabel "GraphifyWrapper"
  if (-not $freshness.fresh) {
    [Console]::Error.WriteLine($freshness.message)
    exit 1
  }
}

$semantic = Get-GraphifySemanticStatus
if (-not $semantic.available) {
  [Console]::Error.WriteLine("Graphify boundary warning: semantic freshness could not be determined. $($semantic.error)")
} elseif ([int]$semantic.pending_count -gt 0) {
  $sample = @($semantic.pending_files | Select-Object -First 5) -join ", "
  $suffix = if ([int]$semantic.pending_count -gt 5) { ", ..." } else { "" }
  [Console]::Error.WriteLine("Graphify boundary warning: AST is fresh; semantic update required for $($semantic.pending_count) docs/media file(s): $sample$suffix")
}

& (Get-GraphifyExe) $Command @Arguments
exit $LASTEXITCODE
