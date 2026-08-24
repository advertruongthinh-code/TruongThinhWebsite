param(
  [switch]$SkipBrowsers,
  [switch]$SkipSolAdvisor
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")
$projectRoot = Get-ProjectRoot
$globalRoot = Get-GlobalToolingRoot
$pins = Get-Content -Raw (Join-Path $projectRoot "tooling-versions.json") | ConvertFrom-Json
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupRoot = Join-Path $globalRoot "backups\bootstrap-$stamp"
$stagingRoot = Join-Path $globalRoot "staging\bootstrap-$stamp"

if ([System.IO.Path]::GetFullPath($projectRoot) -ne "E:\TruongThinh-Website" -and -not (Test-Path -LiteralPath (Join-Path $projectRoot ".git"))) {
  throw "Bootstrap must run from a Git clone root: $projectRoot"
}
if ([System.IO.Path]::GetFullPath($globalRoot) -ne [System.IO.Path]::GetFullPath((Join-Path $env:USERPROFILE ".codex\tooling")) -and -not $env:CODEX_GLOBAL_TOOLING_ROOT) {
  throw "Unexpected global tooling root: $globalRoot"
}
New-Item -ItemType Directory -Force -Path $backupRoot,$stagingRoot,$globalRoot | Out-Null

function Write-Utf8Atomic([string]$Path, [string]$Content) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
  [System.IO.File]::WriteAllText($temporary, $Content, (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Backup-Path([string]$Path, [string]$Relative) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $destination = Join-Path $backupRoot $Relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath $Path -Destination $destination -Recurse -Force
}

foreach ($item in @(
  @{ path = (Join-Path $env:USERPROFILE ".codex\config.toml"); relative = "user\config.toml" },
  @{ path = (Join-Path $env:USERPROFILE ".codex\AGENTS.md"); relative = "user\AGENTS.md" },
  @{ path = (Join-Path $projectRoot ".codex\config.toml"); relative = "project\.codex\config.toml" },
  @{ path = (Join-Path $projectRoot ".serena\project.yml"); relative = "project\.serena\project.yml" },
  @{ path = (Join-Path $projectRoot "package.json"); relative = "project\package.json" },
  @{ path = (Join-Path $projectRoot "pnpm-lock.yaml"); relative = "project\pnpm-lock.yaml" }
)) { Backup-Path $item.path $item.relative }

function Install-GlobalPython {
  $python = Join-Path $globalRoot "python\Scripts\python.exe"
  if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    $base = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    if (-not (Test-Path -LiteralPath $base -PathType Leaf)) {
      $command = Get-Command python -ErrorAction SilentlyContinue
      if (-not $command) { throw "Python 3.12 is unavailable." }
      $base = $command.Source
    }
    & $base -m venv (Join-Path $globalRoot "python")
    if ($LASTEXITCODE -ne 0) { throw "Global Python environment creation failed." }
  }
  & $python -m pip install --disable-pip-version-check --upgrade "uv==$($pins.python.uv)" "graphifyy[$($pins.python.graphify_extras)]==$($pins.python.graphifyy)"
  if ($LASTEXITCODE -ne 0) { throw "Global Graphify installation failed." }

  & $python -m pip install --disable-pip-version-check --upgrade "serena-agent==$($pins.python.'serena-agent')"
  if ($LASTEXITCODE -ne 0) {
    $serenaLauncher = Join-Path $globalRoot "python\Scripts\serena.exe"
    if (-not (Test-Path -LiteralPath $serenaLauncher -PathType Leaf)) {
      throw "Global Serena installation failed and no locked launcher exists for safe repair."
    }

    # pip cannot replace a running Windows console launcher. Restore the wheel
    # payload without touching the generic launcher; new MCP processes then use
    # the upgraded package while existing processes finish on their loaded code.
    $serenaStage = Join-Path $stagingRoot "serena-locked-repair"
    New-Item -ItemType Directory -Force -Path $serenaStage | Out-Null
    & $python -m pip install --disable-pip-version-check --no-deps --target $serenaStage "serena-agent==$($pins.python.'serena-agent')"
    if ($LASTEXITCODE -ne 0) { throw "Locked Serena staged repair failed." }

    $sitePackages = Join-Path $globalRoot "python\Lib\site-packages"
    foreach ($payload in Get-ChildItem -LiteralPath $serenaStage -Force) {
      $target = Join-Path $sitePackages $payload.Name
      if (Test-Path -LiteralPath $target) {
        $payloadBackup = Join-Path $backupRoot "python\serena-payloads\$($payload.Name)"
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $payloadBackup) | Out-Null
        Move-Item -LiteralPath $target -Destination $payloadBackup
      }
      Move-Item -LiteralPath $payload.FullName -Destination $target
    }
  }
  & $python -m pip check
  if ($LASTEXITCODE -ne 0) { throw "Global Python dependency check failed." }
  & (Join-Path $PSScriptRoot "patch-graphify-query.ps1") -Python $python
}

function Install-GlobalNode {
  $nodeRoot = Join-Path $globalRoot "node"
  $package = [ordered]@{
    name = "codex-global-tooling"
    private = $true
    dependencies = [ordered]@{
      "chrome-devtools-mcp" = [string]$pins.node.global.'chrome-devtools-mcp'
      impeccable = [string]$pins.node.global.impeccable
    }
  }
  Write-Utf8Atomic (Join-Path $nodeRoot "package.json") (($package | ConvertTo-Json -Depth 5) + [Environment]::NewLine)
  & (Get-ProjectPnpm) --dir $nodeRoot install --frozen-lockfile=false --no-optional
  if ($LASTEXITCODE -ne 0) { throw "Global Node dependency installation failed." }
}

function Install-PnpmShim {
  $corepack = Get-Command corepack -ErrorAction SilentlyContinue
  if (-not $corepack) { throw "Corepack is required for pinned pnpm." }
  & $corepack.Source install --global "pnpm@$($pins.node.project.pnpm)"
  if ($LASTEXITCODE -ne 0) { throw "Pinned pnpm installation failed." }
  $shim = Join-Path $env:USERPROFILE ".codex\bin\pnpm.cmd"
  $content = @"
@echo off
"$($corepack.Source)" pnpm %*
"@
  Write-Utf8Atomic $shim ($content.TrimEnd() + [Environment]::NewLine)
}

function Get-PinnedRepository([string]$Slug, [string]$DirectoryName) {
  $destination = Join-Path $globalRoot "sources\$DirectoryName"
  $commit = [string]$pins.repositories.$Slug
  if (Test-Path -LiteralPath $destination) {
    $actual = (& git -C $destination rev-parse HEAD 2>$null).Trim()
    if ($actual -eq $commit) { return $destination }
    Move-Item -LiteralPath $destination -Destination (Join-Path $backupRoot "sources-$DirectoryName")
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  & git clone --filter=blob:none --no-checkout ([string]$pins.repository_urls.$Slug) $destination
  if ($LASTEXITCODE -ne 0) { throw "Clone failed: $Slug" }
  & git -C $destination checkout --detach $commit
  if ($LASTEXITCODE -ne 0) { throw "Checkout failed: $Slug@$commit" }
  return $destination
}

function Install-GlobalSkills {
  $agentSource = Get-PinnedRepository "addyosmani/agent-skills" "agent-skills"
  $adhdSource = Get-PinnedRepository "ayghri/i-have-adhd" "i-have-adhd"
  $cavemanSource = Get-PinnedRepository "juliusbrussee/caveman" "caveman"
  $impeccableSource = Get-PinnedRepository "pbakaus/impeccable" "impeccable"
  $ponytailSource = Get-PinnedRepository "dietrichgebert/ponytail" "ponytail"
  $stage = Join-Path $stagingRoot "skills"
  $userAgents = Join-Path $env:USERPROFILE ".agents"
  $destination = Join-Path $userAgents "skills"
  $managedStatePath = Join-Path $globalRoot "state\managed-skills.json"
  $previousManaged = if (Test-Path -LiteralPath $managedStatePath -PathType Leaf) {
    @((Get-Content -Raw -LiteralPath $managedStatePath | ConvertFrom-Json).skills)
  } else { @() }
  New-Item -ItemType Directory -Force -Path $stage,$destination | Out-Null

  $agentSkills = @(Get-ChildItem -LiteralPath (Join-Path $agentSource "skills") -Directory | Where-Object {
    Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md") -PathType Leaf
  })
  $cavemanSkills = @(Get-ChildItem -LiteralPath (Join-Path $cavemanSource "skills") -Directory | Where-Object {
    Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md") -PathType Leaf
  })
  $ponytailSkills = @(Get-ChildItem -LiteralPath (Join-Path $ponytailSource "skills") -Directory | Where-Object {
    Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md") -PathType Leaf
  })

  foreach ($skill in $agentSkills) {
    Copy-Item -LiteralPath $skill.FullName -Destination (Join-Path $stage $skill.Name) -Recurse
  }
  Copy-Item -LiteralPath (Join-Path $adhdSource "skills\i-have-adhd") -Destination (Join-Path $stage "i-have-adhd") -Recurse
  foreach ($skill in $cavemanSkills) {
    Copy-Item -LiteralPath $skill.FullName -Destination (Join-Path $stage $skill.Name) -Recurse
  }
  Copy-Item -LiteralPath (Join-Path $impeccableSource ".agents\skills\impeccable") -Destination (Join-Path $stage "impeccable") -Recurse
  foreach ($skill in $ponytailSkills) {
    Copy-Item -LiteralPath $skill.FullName -Destination (Join-Path $stage $skill.Name) -Recurse
  }

  $nextManaged = @((Get-ChildItem -LiteralPath $stage -Directory).Name + @("graphify") | Sort-Object -Unique)
  foreach ($name in @($previousManaged | Where-Object { $_ -notin $nextManaged })) {
    $target = Join-Path $destination $name
    if (-not (Test-Path -LiteralPath $target)) { continue }
    $skillBackup = Join-Path $backupRoot "skills\$name"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $skillBackup) | Out-Null
    Move-Item -LiteralPath $target -Destination $skillBackup
  }

  foreach ($skill in Get-ChildItem -LiteralPath $stage -Directory) {
    $target = Join-Path $destination $skill.Name
    if (Test-Path -LiteralPath $target) {
      $skillBackup = Join-Path $backupRoot "skills\$($skill.Name)"
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $skillBackup) | Out-Null
      Move-Item -LiteralPath $target -Destination $skillBackup
    }
    Move-Item -LiteralPath $skill.FullName -Destination $target
  }

  $references = Join-Path $userAgents "references"
  if (Test-Path -LiteralPath $references) { Move-Item -LiteralPath $references -Destination (Join-Path $backupRoot "skills-references") }
  Copy-Item -LiteralPath (Join-Path $agentSource "references") -Destination $references -Recurse

  $graphify = Join-Path $destination "graphify"
  if (Test-Path -LiteralPath $graphify) { Move-Item -LiteralPath $graphify -Destination (Join-Path $backupRoot "skills\graphify") }
  & (Join-Path $globalRoot "python\Scripts\graphify.exe") install --platform agents
  if ($LASTEXITCODE -ne 0) { throw "Graphify global skill installation failed." }

  $managed = @(Get-ChildItem -LiteralPath $destination -Directory | Where-Object { $_.Name -in $nextManaged })
  if ($managed.Count -ne [int]$pins.skills.'global-total') { throw "Expected $($pins.skills.'global-total') managed global skills; found $($managed.Count)." }
  Write-Utf8Atomic $managedStatePath (([ordered]@{
    schema = 1
    updated_at = (Get-Date).ToUniversalTime().ToString("o")
    skills = $nextManaged
  } | ConvertTo-Json -Depth 4) + [Environment]::NewLine)
}

function Install-GlobalPersonas {
  $destination = Join-Path $env:USERPROFILE ".codex\agents"
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  $personas = [ordered]@{
    "code-reviewer.toml" = @'
name = "code-reviewer"
description = "Read-only Staff Engineer review across correctness, readability, architecture, security, performance, and test evidence."
sandbox_mode = "read-only"
developer_instructions = "Review only; never edit files. Prioritize real defects over style, cite exact evidence, and give a concrete fix for every critical or important finding."
'@
    "security-auditor.toml" = @'
name = "security-auditor"
description = "Read-only security auditor focused on exploitable findings, trust boundaries, supply chain, and actionable mitigations."
sandbox_mode = "read-only"
developer_instructions = "Audit only; never edit files. Start from trust boundaries, focus on practical exploitability, cite exact evidence, and provide a specific mitigation."
'@
    "test-engineer.toml" = @'
name = "test-engineer"
description = "Read-only QA specialist for test strategy, coverage gaps, edge cases, and Prove-It regression tests."
sandbox_mode = "read-only"
developer_instructions = "Analyze only; never edit files. Test public behavior at the lowest useful level and specify evidence-backed regression checks."
'@
    "web-performance-auditor.toml" = @'
name = "web-performance-auditor"
description = "Read-only web performance auditor for loading, rendering, network behavior, and evidence-backed Core Web Vitals analysis."
sandbox_mode = "read-only"
developer_instructions = "Audit only; never edit files. Label source findings as potential impact and accept metrics only from named runtime evidence."
'@
  }
  foreach ($entry in $personas.GetEnumerator()) {
    $path = Join-Path $destination $entry.Key
    if (Test-Path -LiteralPath $path) { Backup-Path $path "agents\$($entry.Key)" }
    Write-Utf8Atomic $path ($entry.Value.Trim() + [Environment]::NewLine)
  }
}

function Remove-TomlTree([string]$Text, [string]$Prefix) {
  $result = [System.Collections.Generic.List[string]]::new()
  $skip = $false
  foreach ($line in ($Text -split "`r?`n")) {
    if ($line.Trim() -match '^\[(.+)\]$') {
      $table = $Matches[1]
      $skip = $table -eq $Prefix -or $table.StartsWith("$Prefix.", [System.StringComparison]::Ordinal)
    }
    if (-not $skip) { $result.Add($line) }
  }
  return (($result -join [Environment]::NewLine).TrimEnd() + [Environment]::NewLine)
}

function Set-TomlKeys([string]$Text, [string]$Table, [System.Collections.IDictionary]$Values) {
  $lines = [System.Collections.Generic.List[string]]::new()
  foreach ($line in ($Text -split "`r?`n")) { $lines.Add($line) }
  $header = "[$Table]"
  $start = -1
  for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i].Trim() -eq $header) { $start = $i; break } }
  if ($start -lt 0) {
    if ($lines.Count -gt 0 -and $lines[$lines.Count - 1]) { $lines.Add("") }
    $lines.Add($header)
    foreach ($key in $Values.Keys) { $lines.Add("$key = $($Values[$key])") }
    return (($lines -join [Environment]::NewLine).TrimEnd() + [Environment]::NewLine)
  }
  $end = $lines.Count
  for ($i = $start + 1; $i -lt $lines.Count; $i++) { if ($lines[$i].Trim() -match '^\[.+\]$') { $end = $i; break } }
  foreach ($key in $Values.Keys) {
    $found = $false
    for ($i = $start + 1; $i -lt $end; $i++) {
      if ($lines[$i] -match "^\s*$([regex]::Escape([string]$key))\s*=") { $lines[$i] = "$key = $($Values[$key])"; $found = $true; break }
    }
    if (-not $found) { $lines.Insert($end, "$key = $($Values[$key])"); $end++ }
  }
  return (($lines -join [Environment]::NewLine).TrimEnd() + [Environment]::NewLine)
}

function Configure-Codex {
  $codexHome = Join-Path $env:USERPROFILE ".codex"
  $configPath = Join-Path $codexHome "config.toml"
  $text = if (Test-Path -LiteralPath $configPath) { Get-Content -Raw -LiteralPath $configPath } else { "" }
  foreach ($tree in @('hooks.state', 'marketplaces.ponytail', 'plugins."ponytail@ponytail"', 'mcp_servers.serena', 'mcp_servers.graphify', 'mcp_servers.chrome_devtools')) {
    $text = Remove-TomlTree $text $tree
  }
  $text = Set-TomlKeys $text "features" ([ordered]@{ hooks = "false"; multi_agent = "true" })
  $text = Set-TomlKeys $text "agents" ([ordered]@{ max_concurrent_threads_per_session = "4" })
  $wrapper = (Join-Path $globalRoot "bin\mcp.ps1").Replace("\", "\\")
  $mcp = @"

[mcp_servers.serena]
command = "pwsh"
args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$wrapper", "serena"]
startup_timeout_sec = 90
tool_timeout_sec = 180
enabled = true
required = true

[mcp_servers.graphify]
command = "pwsh"
args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$wrapper", "graphify"]
startup_timeout_sec = 60
tool_timeout_sec = 120
enabled = true
required = true

[mcp_servers.chrome_devtools]
command = "pwsh"
args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$wrapper", "chrome-devtools"]
startup_timeout_sec = 90
tool_timeout_sec = 180
enabled = true
required = false
default_tools_approval_mode = "prompt"
"@
  Write-Utf8Atomic $configPath ($text.TrimEnd() + $mcp + [Environment]::NewLine)

  $agentsPath = Join-Path $codexHome "AGENTS.md"
  $existing = if (Test-Path -LiteralPath $agentsPath) { Get-Content -Raw -LiteralPath $agentsPath } else { "" }
  $block = @'
<!-- codex:global-stack:start -->
## Global agent stack

Apply these rules in the main agent and every coordinator, explorer, worker, reviewer, and subagent.

1. Always load `i-have-adhd`, `caveman` in ultra mode, and `ponytail` in ultra mode. ADHD controls actionable structure, Caveman controls terse prose, and Ponytail controls implementation minimalism. A closer project `AGENTS.md` may explicitly disable Caveman.
2. For codebase or project-content exploration, query Graphify first for architecture, relationships, cross-document links, and blast radius; then use Serena for exact symbols, references, diagnostics, and refactors. Graphify includes meaningful text, PDF, and Office content but excludes media and generated/vendor state.
3. Serena is required per task/session with `--context codex --project-from-cwd`; synchronize language servers from actual project extensions instead of editing the language list manually.
4. For visible UI changes, load `impeccable` and run `impeccable detect`. These integrations use skills/rules only; never install Codex lifecycle hooks.
5. Sol Advisor 0.6 is fail-closed and requires primary Sol/High plus a declared SELECTIVE ROUTE before task tools. Use solo by default; delegate selects one Luna/Max or Terra/High implementer, audit selects one fresh read-only Sol/High reviewer, and full is only for an explicit broad or high-risk exception.
6. Route every semantic task, including Graphify semantic extraction and content synthesis, to `gpt-5.6-luna` with reasoning effort `max`. Pin both values explicitly for spawned semantic workers; do not inherit a different model or effort.
7. Build or update the Graphify semantic index only when the user explicitly requests it. Otherwise report pending semantic files and do not spawn extraction workers, merge chunks, or write semantic cache or manifest state; structural AST refresh may still run through approved wrappers and watchers.
8. Verify information, knowledge, and decisions against local evidence and primary official sources. Mark every inference explicitly, re-check unstable facts, and never present an unsupported guess as fact.
<!-- codex:global-stack:end -->
'@
  $pattern = '(?s)<!-- codex:global-stack:start -->.*?<!-- codex:global-stack:end -->'
  $updated = if ($existing -match $pattern) { [regex]::Replace($existing, $pattern, $block.Trim()) } else { $existing.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $block.Trim() }
  Write-Utf8Atomic $agentsPath ($updated.TrimEnd() + [Environment]::NewLine)
}

function Retire-ProjectPayloads {
  foreach ($relative in @(".agents\skills", ".codex\agents", ".tooling\python", ".tooling\runtimes", ".tooling\vendor")) {
    $source = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
    if (-not $source.StartsWith($projectRoot + "\", [System.StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe retirement target: $source" }
    if (-not (Test-Path -LiteralPath $source)) { continue }
    $destination = Join-Path $backupRoot "retired-project\$relative"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Move-Item -LiteralPath $source -Destination $destination
  }
}

Install-GlobalPython
Install-PnpmShim
Install-GlobalNode
Install-GlobalSkills
Install-GlobalPersonas
New-Item -ItemType Directory -Force -Path (Join-Path $globalRoot "bin"),(Join-Path $globalRoot "logs"),(Join-Path $globalRoot "state\serena") | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "global-mcp.ps1") -Destination (Join-Path $globalRoot "bin\mcp.ps1") -Force
if (-not $SkipSolAdvisor) { & (Join-Path $PSScriptRoot "install-sol-advisor.ps1") }
Configure-Codex
$graphifyPythonMarker = Join-Path $projectRoot "graphify-out\.graphify_python"
if (Test-Path -LiteralPath $graphifyPythonMarker -PathType Leaf) {
  Write-Utf8Atomic $graphifyPythonMarker ((Join-Path $globalRoot "python\Scripts\python.exe") + [Environment]::NewLine)
}

Use-ProjectToolPath
& (Get-ProjectPnpm) --dir $projectRoot install --frozen-lockfile --no-optional
if ($LASTEXITCODE -ne 0) { throw "Project pnpm install failed." }
if (-not $SkipBrowsers) {
  $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $projectRoot ".tooling\browsers"
  & (Get-ProjectNode) (Join-Path $projectRoot "node_modules\playwright\cli.js") install chromium firefox webkit
  if ($LASTEXITCODE -ne 0) { throw "Playwright browser installation failed." }
}

& (Join-Path $PSScriptRoot "graphify-git-hooks.ps1") -Action install
& (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Apply
Retire-ProjectPayloads
& (Join-Path $PSScriptRoot "doctor.ps1")
if ($LASTEXITCODE -ne 0) { throw "Tooling doctor failed; backup remains at $backupRoot" }

$manifest = [ordered]@{
  schema = 2
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  global_root = $globalRoot
  backup = $backupRoot
  versions = $pins
}
Write-Utf8Atomic (Join-Path $projectRoot ".tooling\state\install-manifest.json") (($manifest | ConvertTo-Json -Depth 12) + [Environment]::NewLine)
Write-Output "Global stack and project tooling ready."
Write-Output "Backup: $backupRoot"
