param(
  [Parameter(Mandatory)]
  [ValidateSet("serena", "graphify", "chrome-devtools")]
  [string]$Service,
  # Serena context per host: Codex config omits it; Claude Code passes claude-code.
  [ValidateSet("codex", "claude-code")]
  [string]$Context = "codex"
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
    $env:PYTHONUTF8 = "1"
    $env:PYTHONIOENCODING = "utf-8"

    # MCP hosts launch this script with a minimal environment; add global runtimes.
    $uvRuntimeRoot = Join-Path $toolRoot "runtimes"
    if (Test-Path -LiteralPath $uvRuntimeRoot -PathType Container) {
      foreach ($uvDir in (Get-ChildItem -LiteralPath $uvRuntimeRoot -Directory -Filter "uv-*" -ErrorAction SilentlyContinue)) {
        $env:PATH = "$($uvDir.FullName);$env:PATH"
      }
    }
    $codexRuntimeRoot = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\runtimes"
    if (Test-Path -LiteralPath $codexRuntimeRoot -PathType Container) {
      $nodeDirs = Get-ChildItem -LiteralPath $codexRuntimeRoot -Directory -Recurse -Depth 2 -ErrorAction SilentlyContinue |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "node.exe") -PathType Leaf }
      foreach ($nodeDir in $nodeDirs) { $env:PATH = "$($nodeDir.FullName);$env:PATH" }
    }
    if ($env:ProgramFiles) {
      $programFilesNode = $env:ProgramFiles + "\nodejs"
      if (Test-Path -LiteralPath $programFilesNode -PathType Container) { $env:PATH = "$programFilesNode;$env:PATH" }
    }

    & $env:SERENA_EXE --version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Serena executable failed its version check." }

    $sync = Join-Path $projectRoot "scripts\tooling\serena_sync.py"
    if ((Test-Path -LiteralPath $sync -PathType Leaf) -and (Test-Path -LiteralPath (Join-Path $projectRoot ".serena\project.yml") -PathType Leaf)) {
      & $python $sync --root $projectRoot --apply | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "Serena language sync failed." }
    }
    & $env:SERENA_EXE start-mcp-server --transport stdio --context $Context --project-from-cwd --enable-web-dashboard false --open-web-dashboard false
    exit $LASTEXITCODE
  }
  "graphify" {
    & $python -m graphify.serve
    exit $LASTEXITCODE
  }
  "chrome-devtools" {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $node = if ($nodeCommand) { $nodeCommand.Source } else { $null }
    if (-not $node) {
      $cacheNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
      $localNode = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\runtimes\cua_node"
      $node = $cacheNode
      if (-not (Test-Path -LiteralPath $node -PathType Leaf) -and (Test-Path -LiteralPath $localNode -PathType Container)) {
        $found = Get-ChildItem -LiteralPath $localNode -Directory -Recurse -Depth 2 -ErrorAction SilentlyContinue |
          Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "node.exe") -PathType Leaf } |
          Select-Object -First 1
        if ($found) { $node = Join-Path $found.FullName "node.exe" }
      }
    }
    if (-not (Test-Path -LiteralPath $node -PathType Leaf)) { throw "Node.js is unavailable." }
    $entry = Join-Path $toolRoot "node\node_modules\chrome-devtools-mcp\build\src\bin\chrome-devtools-mcp.js"
    $log = Join-Path $toolRoot "logs\chrome-devtools-mcp.log"
    $env:CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS = "1"
    & $node $entry --isolated --no-usage-statistics --no-performance-crux --redact-network-headers --logFile $log
    exit $LASTEXITCODE
  }
}
