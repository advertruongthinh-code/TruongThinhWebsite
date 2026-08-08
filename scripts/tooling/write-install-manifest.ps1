param([string]$Backup)

. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "graphify-freshness.ps1")
$root = Get-ProjectRoot
$versions = Get-Content -Raw (Join-Path $root "tooling-versions.json") | ConvertFrom-Json
if (-not $Backup) {
  $Backup = Get-ChildItem -LiteralPath (Join-Path $root ".tooling\backups") -Directory -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}
$backupValue = $Backup
if ($Backup) {
  $resolvedBackup = [System.IO.Path]::GetFullPath($Backup)
  if ($resolvedBackup.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    $backupValue = $resolvedBackup.Substring($root.Length + 1).Replace("\", "/")
  }
}

$fixedPaths = @(
  "AGENTS.md", ".assetsignore", ".gitignore", ".graphifyignore",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "playwright.config.cjs",
  "tooling-versions.json", ".codex\config.toml", ".codex\hooks.json",
  ".serena\project.yml", ".git\hooks\post-commit", ".git\hooks\post-checkout",
  "tests\cross-browser.smoke.spec.cjs", "tests\tooling\hook-fixtures.ps1",
  "tests\tooling\graphify-freshness-fixtures.ps1",
  "tests\tooling\test_serena_sync.py"
)
$scriptPaths = Get-ChildItem -LiteralPath (Join-Path $root "scripts\tooling") -File |
  ForEach-Object { $_.FullName.Substring($root.Length + 1) }
$personaPaths = Get-ChildItem -LiteralPath (Join-Path $root ".codex\agents") -Filter "*.toml" -File |
  ForEach-Object { $_.FullName.Substring($root.Length + 1) }

$checksums = foreach ($relative in @($fixedPaths + $scriptPaths + $personaPaths | Sort-Object -Unique)) {
  $path = Join-Path $root $relative
  if (Test-Path -LiteralPath $path -PathType Leaf) {
    [ordered]@{
      path = $relative.Replace("\", "/")
      sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
      bytes = (Get-Item -LiteralPath $path).Length
    }
  }
}

$skillChecksums = Get-ChildItem -LiteralPath (Join-Path $root ".agents\skills") -Directory | ForEach-Object {
  $skillFile = Join-Path $_.FullName "SKILL.md"
  if (Test-Path -LiteralPath $skillFile) {
    [ordered]@{
      name = $_.Name
      sha256 = (Get-FileHash -LiteralPath $skillFile -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }
}

$serena = & (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Check | ConvertFrom-Json
$graph = Get-Content -Raw (Join-Path $root "graphify-out\graph.json") | ConvertFrom-Json
$semantic = Get-GraphifySemanticStatus
$browserPayloads = Get-ChildItem -LiteralPath (Join-Path $root ".tooling\browsers") -Directory |
  Select-Object -ExpandProperty Name

$manifest = [ordered]@{
  schema = 1
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  policy = "project-only; pinned; notify-only updates"
  versions = $versions
  files = @($checksums)
  skills = @($skillChecksums)
  personas = @($personaPaths | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) })
  serena = [ordered]@{
    languages = @($serena.languages)
    schema_key = $serena.schema_key
    unsupported_present = @($serena.unsupported_present)
    unknown_present = @($serena.unknown_present)
    restart_required = Test-Path -LiteralPath (Join-Path $root ".tooling\state\serena\restart-required.json")
  }
  graphify = [ordered]@{
    nodes = @($graph.nodes).Count
    edges = @($graph.links).Count
    freshness_policy = "wrapper-boundary"
    semantic_status_available = [bool]$semantic.available
    semantic_pending_count = $semantic.pending_count
  }
  browsers = @($browserPayloads)
  backup = $backupValue
}

$path = Join-Path $root "tooling-install-manifest.json"
$temporary = "$path.tmp"
[System.IO.File]::WriteAllText($temporary, (($manifest | ConvertTo-Json -Depth 12) + [Environment]::NewLine))
Move-Item -LiteralPath $temporary -Destination $path -Force
Write-Output $path
