Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-GlobalToolingRoot {
  $root = if ($env:CODEX_GLOBAL_TOOLING_ROOT) {
    $env:CODEX_GLOBAL_TOOLING_ROOT
  } else {
    Join-Path $env:USERPROFILE ".codex\tooling"
  }
  return [System.IO.Path]::GetFullPath($root)
}

function Get-ProjectPython {
  $python = Join-Path (Get-GlobalToolingRoot) "python\Scripts\python.exe"
  if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw "Global tooling Python is missing: $python. Run pnpm tooling:bootstrap."
  }
  return $python
}

function Get-SerenaExe {
  $exe = Join-Path (Get-GlobalToolingRoot) "python\Scripts\serena.exe"
  if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw "Global Serena is missing: $exe. Run pnpm tooling:bootstrap."
  }
  return $exe
}

function Get-GraphifyExe {
  $exe = Join-Path (Get-GlobalToolingRoot) "python\Scripts\graphify.exe"
  if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw "Global Graphify is missing: $exe. Run pnpm tooling:bootstrap."
  }
  return $exe
}

function Get-ProjectNode {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $bundled = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path -LiteralPath $bundled -PathType Leaf) { return $bundled }
  throw "Node 22+ is missing. Install Node or use the Codex bundled runtime."
}

function Get-ProjectPnpm {
  $command = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $bundled = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
  if (Test-Path -LiteralPath $bundled -PathType Leaf) { return $bundled }
  throw "pnpm is missing."
}

function Use-ProjectToolPath {
  $nodeDirectory = Split-Path -Parent (Get-ProjectNode)
  $projectNodeBin = Join-Path (Get-ProjectRoot) "node_modules\.bin"
  $globalRoot = Get-GlobalToolingRoot
  $globalPython = Join-Path $globalRoot "python\Scripts"
  $globalNodeBin = Join-Path $globalRoot "node\node_modules\.bin"
  $globalBin = Join-Path $globalRoot "bin"
  $env:PATH = ((@($globalPython, $globalNodeBin, $globalBin, $projectNodeBin, $nodeDirectory, $env:PATH)) -join ";")
  $env:PYTHONUTF8 = "1"
}

function Initialize-ToolingState {
  $root = Get-ProjectRoot
  foreach ($relative in @(".tooling\logs", ".tooling\state\serena", ".tooling\state\graphify")) {
    New-Item -ItemType Directory -Force -Path (Join-Path $root $relative) | Out-Null
  }
}
