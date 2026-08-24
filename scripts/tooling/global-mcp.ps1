param(
  [Parameter(Mandatory)]
  [ValidateSet("serena", "graphify", "chrome-devtools")]
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
  "serena" {
    $env:SERENA_HOME = Join-Path $toolRoot "state\serena\home"
    $env:SERENA_EXE = Join-Path $toolRoot "python\Scripts\serena.exe"
    $sync = Join-Path $projectRoot "scripts\tooling\serena_sync.py"
    if ((Test-Path -LiteralPath $sync -PathType Leaf) -and (Test-Path -LiteralPath (Join-Path $projectRoot ".serena\project.yml") -PathType Leaf)) {
      & $python $sync --root $projectRoot --apply | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "Serena language sync failed." }
    }
    & $env:SERENA_EXE start-mcp-server --transport stdio --context codex --project-from-cwd --enable-web-dashboard false --open-web-dashboard false
    exit $LASTEXITCODE
  }
  "graphify" {
    & $python -m graphify.serve
    exit $LASTEXITCODE
  }
  "chrome-devtools" {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $node) {
      $node = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    }
    if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw "Node.js is unavailable." }
    $entry = Join-Path $toolRoot "node\node_modules\chrome-devtools-mcp\build\src\bin\chrome-devtools-mcp.js"
    $log = Join-Path $toolRoot "logs\chrome-devtools-mcp.log"
    $env:CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS = "1"
    & $node $entry --isolated --no-usage-statistics --no-performance-crux --redact-network-headers --logFile $log
    exit $LASTEXITCODE
  }
}
