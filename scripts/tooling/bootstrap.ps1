param([switch]$SkipBrowsers)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
$versions = Get-Content -Raw (Join-Path $root "tooling-versions.json") | ConvertFrom-Json
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupRoot = Join-Path $root ".tooling\backups\bootstrap-$stamp"
$stagingRoot = Join-Path $root ".tooling\staging\bootstrap-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot,$stagingRoot | Out-Null

function Install-PortableRuntime {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Version,
    [Parameter(Mandatory)][string]$Uri,
    [Parameter(Mandatory)][string]$Sha256,
    [Parameter(Mandatory)][string]$ArchiveName,
    [Parameter(Mandatory)][string]$Executable
  )
  $destination = Join-Path $root ".tooling\runtimes\$Name-$Version"
  if (Test-Path -LiteralPath (Join-Path $destination $Executable) -PathType Leaf) { return }
  $staging = Join-Path $root ".tooling\staging\runtime-$Name-$Version"
  New-Item -ItemType Directory -Force -Path $staging,$destination | Out-Null
  $archive = Join-Path $staging $ArchiveName
  Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $archive
  $actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $Sha256.ToLowerInvariant()) { throw "$Name checksum mismatch: $actual" }
  Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
  if (-not (Test-Path -LiteralPath (Join-Path $destination $Executable) -PathType Leaf)) {
    throw "$Name executable missing after extraction: $Executable"
  }
}

function Get-PinnedRepository {
  param(
    [Parameter(Mandatory)][string]$Slug,
    [Parameter(Mandatory)][string]$DirectoryName
  )
  $destination = Join-Path $stagingRoot $DirectoryName
  $url = [string]$versions.repository_urls.$Slug
  $commit = [string]$versions.repositories.$Slug
  & git clone --filter=blob:none --no-checkout $url $destination
  if ($LASTEXITCODE -ne 0) { throw "Clone failed: $Slug" }
  & git -C $destination checkout --detach $commit
  if ($LASTEXITCODE -ne 0) { throw "Checkout failed: $Slug@$commit" }
  $actual = (& git -C $destination rev-parse HEAD).Trim()
  if ($actual -ne $commit) { throw "Commit verification failed for $Slug`: $actual" }
  return $destination
}

function Install-ProjectSkills {
  $agentSource = Get-PinnedRepository -Slug "addyosmani/agent-skills" -DirectoryName "agent-skills"
  $impeccableSource = Get-PinnedRepository -Slug "pbakaus/impeccable" -DirectoryName "impeccable"
  $ponytailSource = Get-PinnedRepository -Slug "dietrichgebert/ponytail" -DirectoryName "ponytail"
  $skillStage = Join-Path $stagingRoot "project-skills"
  New-Item -ItemType Directory -Force -Path $skillStage | Out-Null

  $agentSkills = @(Get-ChildItem -LiteralPath (Join-Path $agentSource "skills") -Directory)
  if ($agentSkills.Count -ne [int]$versions.skills.'agent-skills-count') {
    throw "Expected $($versions.skills.'agent-skills-count') agent-skills; found $($agentSkills.Count)."
  }
  foreach ($skill in $agentSkills) {
    $destination = Join-Path $skillStage $skill.Name
    Copy-Item -LiteralPath $skill.FullName -Destination $destination -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $agentSource "references") -Destination (Join-Path $destination "references") -Recurse -Force
  }
  Copy-Item -LiteralPath (Join-Path $impeccableSource ".agents\skills\impeccable") -Destination (Join-Path $skillStage "impeccable") -Recurse -Force
  $ponytailSkills = @(Get-ChildItem -LiteralPath (Join-Path $ponytailSource "skills") -Directory -Filter "ponytail*")
  if ($ponytailSkills.Count -ne [int]$versions.skills.'ponytail-count') {
    throw "Expected $($versions.skills.'ponytail-count') Ponytail skills; found $($ponytailSkills.Count)."
  }
  foreach ($skill in $ponytailSkills) {
    Copy-Item -LiteralPath $skill.FullName -Destination (Join-Path $skillStage $skill.Name) -Recurse -Force
  }

  $expected = [int]$versions.skills.'agent-skills-count' + [int]$versions.skills.'ponytail-count' + 1
  $actual = @(Get-ChildItem -LiteralPath $skillStage -Directory).Count
  if ($actual -ne $expected) { throw "Staged skill verification failed: expected $expected, found $actual." }
  $agentsRoot = Join-Path $root ".agents"
  New-Item -ItemType Directory -Force -Path $agentsRoot | Out-Null
  $current = Join-Path $agentsRoot "skills"
  if (Test-Path -LiteralPath $current) {
    Move-Item -LiteralPath $current -Destination (Join-Path $backupRoot "installed-skills-before-swap")
  }
  Move-Item -LiteralPath $skillStage -Destination $current
}

$backupTargets = @(
  "AGENTS.md", ".gitignore", ".agents", ".codex", ".serena", "graphify-out",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tooling-versions.json",
  "tooling-install-manifest.json", "docs\memory\CURRENT.md", "docs\memory\DECISIONS.md"
)
foreach ($relative in $backupTargets) {
  $source = Join-Path $root $relative
  if (-not (Test-Path -LiteralPath $source)) { continue }
  $destination = Join-Path $backupRoot $relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
}
$records = Get-ChildItem -LiteralPath $backupRoot -Recurse -File | ForEach-Object {
  [ordered]@{
    path = $_.FullName.Substring($backupRoot.Length + 1).Replace("\", "/")
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    bytes = $_.Length
  }
}
$manifest = [ordered]@{ created_at = (Get-Date).ToUniversalTime().ToString("o"); files = @($records) }
[System.IO.File]::WriteAllText((Join-Path $backupRoot "checksums.json"), (($manifest | ConvertTo-Json -Depth 6) + [Environment]::NewLine))

Install-PortableRuntime -Name "uv" -Version $versions.runtimes.uv.version -Uri $versions.runtimes.uv.url -Sha256 $versions.runtimes.uv.sha256 -ArchiveName "uv.zip" -Executable "uv.exe"
Install-PortableRuntime -Name "powershell" -Version $versions.runtimes.powershell.version -Uri $versions.runtimes.powershell.url -Sha256 $versions.runtimes.powershell.sha256 -ArchiveName "powershell.zip" -Executable "pwsh.exe"
Use-ProjectToolPath
Install-ProjectSkills

$python = Join-Path $root ".tooling\python\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
  $basePython = Get-Command python -ErrorAction SilentlyContinue
  if (-not $basePython) {
    $bundled = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    if (-not (Test-Path -LiteralPath $bundled)) { throw "Python 3.12 runtime not found." }
    $basePython = [pscustomobject]@{ Source = $bundled }
  }
  & $basePython.Source -m venv (Join-Path $root ".tooling\python")
}
& $python -m pip install --disable-pip-version-check "serena-agent==$($versions.python.'serena-agent')" "graphifyy[all]==$($versions.python.graphifyy)"
if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed." }

$node = Get-ProjectNode
$pnpm = Get-ProjectPnpm
$env:PATH = (Split-Path -Parent $node) + ";" + $env:PATH
& $pnpm install --frozen-lockfile --no-optional
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed." }

if (-not $SkipBrowsers) {
  $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $root ".tooling\browsers"
  & $node (Join-Path $root "node_modules\playwright\cli.js") install chromium firefox webkit
  if ($LASTEXITCODE -ne 0) { throw "Playwright browser installation failed." }
}

& (Get-GraphifyExe) install --project --platform codex
if ($LASTEXITCODE -ne 0) { throw "Graphify project integration failed." }
$env:GIT_CONFIG_COUNT = "1"
$env:GIT_CONFIG_KEY_0 = "safe.directory"
$env:GIT_CONFIG_VALUE_0 = $root.Replace("\", "/")
& (Get-GraphifyExe) hook uninstall
& (Get-GraphifyExe) hook install
if ($LASTEXITCODE -ne 0) { throw "Graphify managed Git hook installation failed." }
$legacyGraphifySkill = Join-Path $root ".codex\skills\graphify"
$projectGraphifySkill = Join-Path $root ".agents\skills\graphify"
if (-not (Test-Path -LiteralPath $legacyGraphifySkill)) { throw "Graphify skill payload is missing after install." }
Move-Item -LiteralPath $legacyGraphifySkill -Destination $projectGraphifySkill
# Keep the portable skill, then remove the duplicate Codex hook and AGENTS block.
& (Get-GraphifyExe) uninstall --project --platform codex
if ($LASTEXITCODE -ne 0) { throw "Graphify duplicate Codex integration cleanup failed." }
& $node (Join-Path $root "node_modules\impeccable\cli\bin\cli.js") install --providers=codex --scope=project -y
if ($LASTEXITCODE -ne 0) { throw "Impeccable project integration failed." }
& (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Apply
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "hooks.template.json") -Destination (Join-Path $root ".codex\hooks.json") -Force
& (Join-Path $PSScriptRoot "doctor.ps1")
if ($LASTEXITCODE -ne 0) { throw "Project tooling doctor failed; backup remains at $backupRoot." }

$manifestPaths = @(
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tooling-versions.json",
  ".codex\config.toml", ".codex\hooks.json", ".serena\project.yml",
  ".git\hooks\post-commit", ".git\hooks\post-checkout"
)
$checksums = foreach ($relative in $manifestPaths) {
  $path = Join-Path $root $relative
  if (Test-Path -LiteralPath $path -PathType Leaf) {
    [ordered]@{ path = $relative.Replace("\", "/"); sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
}
$skillChecksums = Get-ChildItem -LiteralPath (Join-Path $root ".agents\skills") -Directory | ForEach-Object {
  $skillFile = Join-Path $_.FullName "SKILL.md"
  if (Test-Path -LiteralPath $skillFile) {
    [ordered]@{ name = $_.Name; sha256 = (Get-FileHash -LiteralPath $skillFile -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
}
$installManifest = [ordered]@{
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  versions = $versions
  files = @($checksums)
  skills = @($skillChecksums)
  backup = $backupRoot
}
$manifestPath = Join-Path $root "tooling-install-manifest.json"
$temporaryManifest = "$manifestPath.tmp"
[System.IO.File]::WriteAllText($temporaryManifest, (($installManifest | ConvertTo-Json -Depth 10) + [Environment]::NewLine))
Move-Item -LiteralPath $temporaryManifest -Destination $manifestPath -Force
Write-Output "Project tooling installed. Manifest: $manifestPath"
Write-Output "Backup: $backupRoot"
& (Join-Path $PSScriptRoot "write-install-manifest.ps1") -Backup $backupRoot | Out-Null
