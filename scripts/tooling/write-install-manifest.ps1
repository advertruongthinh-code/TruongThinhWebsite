param([string]$Backup)

. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "graphify-freshness.ps1")
$root = Get-ProjectRoot
$global = Get-GlobalToolingRoot
$versions = Get-Content -Raw (Join-Path $root "tooling-versions.json") | ConvertFrom-Json

$fixedPaths = @(
  "AGENTS.md", ".gitignore", ".graphifyignore", "package.json", "pnpm-lock.yaml",
  "tooling-versions.json", ".codex\config.toml", ".vscode\tasks.json",
  ".serena\project.yml", ".git\hooks\post-commit", ".git\hooks\post-checkout",
  ".git\hooks\pre-commit", ".git\hooks\pre-push",
  "docs\operations\TOOLING.md", "docs\operations\graphify.md"
)
$scriptPaths = Get-ChildItem -LiteralPath (Join-Path $root "scripts\tooling") -File |
  ForEach-Object { $_.FullName.Substring($root.Length + 1) }
$checksums = foreach ($relative in @($fixedPaths + $scriptPaths | Sort-Object -Unique)) {
  $path = Join-Path $root $relative
  if (Test-Path -LiteralPath $path -PathType Leaf) {
    [ordered]@{
      path = $relative.Replace("\", "/")
      sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
      bytes = (Get-Item -LiteralPath $path).Length
    }
  }
}

$skills = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE ".agents\skills") -Directory | ForEach-Object {
  $skillFile = Join-Path $_.FullName "SKILL.md"
  if (Test-Path -LiteralPath $skillFile) {
    [ordered]@{ name = $_.Name; sha256 = (Get-FileHash -LiteralPath $skillFile -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
}
$personas = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE ".codex\agents") -Filter "*.toml" -File |
  Select-Object -ExpandProperty BaseName
$serena = & (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Check | ConvertFrom-Json
$graph = Get-Content -Raw (Join-Path $root "graphify-out\graph.json") | ConvertFrom-Json
$semantic = Get-GraphifySemanticStatus
$browserPayloads = Get-ChildItem -LiteralPath (Join-Path $root ".tooling\browsers") -Directory | Select-Object -ExpandProperty Name

$manifest = [ordered]@{
  schema = 2
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  policy = "user-global agent stack; project-local browser QA; notify-only updates"
  global_root = $global
  versions = $versions
  files = @($checksums)
  skills = @($skills)
  personas = @($personas)
  serena = [ordered]@{
    languages = @($serena.languages)
    schema_key = $serena.schema_key
    unsupported_present = @($serena.unsupported_present)
    unknown_present = @($serena.unknown_present)
  }
  graphify = [ordered]@{
    nodes = @($graph.nodes).Count
    edges = @($graph.links).Count
    semantic_status_available = [bool]$semantic.available
    semantic_pending_count = $semantic.pending_count
  }
  browsers = @($browserPayloads)
  backup = $Backup
}

$path = Join-Path $root ".tooling\state\install-manifest.json"
$temporary = "$path.tmp"
[System.IO.File]::WriteAllText($temporary, (($manifest | ConvertTo-Json -Depth 12) + [Environment]::NewLine))
Move-Item -LiteralPath $temporary -Destination $path -Force
Write-Output $path
