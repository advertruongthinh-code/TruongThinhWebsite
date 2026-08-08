Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-ProjectPython {
  $python = Join-Path (Get-ProjectRoot) ".tooling\python\Scripts\python.exe"
  if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw "Project Python is missing: $python. Run scripts/tooling/bootstrap.ps1."
  }
  return $python
}

function Get-SerenaExe {
  $exe = Join-Path (Get-ProjectRoot) ".tooling\python\Scripts\serena.exe"
  if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw "Serena is missing: $exe. Run scripts/tooling/bootstrap.ps1."
  }
  return $exe
}

function Get-GraphifyExe {
  $exe = Join-Path (Get-ProjectRoot) ".tooling\python\Scripts\graphify.exe"
  if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw "Graphify is missing: $exe. Run scripts/tooling/bootstrap.ps1."
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

function Get-ProjectUvDirectory {
  $directory = Join-Path (Get-ProjectRoot) ".tooling\runtimes\uv-0.12.3"
  if (-not (Test-Path -LiteralPath (Join-Path $directory "uv.exe") -PathType Leaf)) {
    throw "Project uv runtime is missing: $directory. Run scripts/tooling/bootstrap.ps1."
  }
  return $directory
}

function Get-ProjectPwshDirectory {
  $directory = Join-Path (Get-ProjectRoot) ".tooling\runtimes\powershell-7.6.4"
  if (-not (Test-Path -LiteralPath (Join-Path $directory "pwsh.exe") -PathType Leaf)) {
    throw "Project PowerShell runtime is missing: $directory. Run scripts/tooling/bootstrap.ps1."
  }
  return $directory
}

function Use-ProjectToolPath {
  $nodeDirectory = Split-Path -Parent (Get-ProjectNode)
  $nodeModulesBin = Join-Path (Get-ProjectRoot) "node_modules\.bin"
  $pythonDirectory = Join-Path (Get-ProjectRoot) ".tooling\python\Scripts"
  $directories = @((Get-ProjectUvDirectory), (Get-ProjectPwshDirectory), $pythonDirectory, $nodeModulesBin, $nodeDirectory)
  $env:PATH = (($directories + @($env:PATH)) -join ";")
  $env:PYTHONUTF8 = "1"
}

function Initialize-ToolingState {
  $root = Get-ProjectRoot
  foreach ($relative in @(".tooling\logs", ".tooling\state\hooks", ".tooling\state\serena", ".tooling\state\graphify")) {
    New-Item -ItemType Directory -Force -Path (Join-Path $root $relative) | Out-Null
  }
}
