$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$dispatcher = Join-Path $root "scripts\tooling\hook-dispatch.ps1"
$projectPwsh = Join-Path $root ".tooling\runtimes\powershell-7.6.4\pwsh.exe"
if (-not (Test-Path -LiteralPath $projectPwsh -PathType Leaf)) { throw "Pinned project PowerShell is missing: $projectPwsh" }

function Invoke-HookProcess([string]$Event, [string]$Payload) {
  $start = [System.Diagnostics.ProcessStartInfo]::new()
  $start.FileName = $projectPwsh
  $start.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$dispatcher`" -Event $Event"
  $start.WorkingDirectory = $root
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($start)
  $process.StandardInput.Write($Payload)
  $process.StandardInput.Close()
  return $process
}

function Complete-HookProcess([System.Diagnostics.Process]$Process, [int]$TimeoutMs = 240000) {
  $stdoutTask = $Process.StandardOutput.ReadToEndAsync()
  $stderrTask = $Process.StandardError.ReadToEndAsync()
  if (-not $Process.WaitForExit($TimeoutMs)) {
    $Process.Kill()
    throw "Hook fixture timed out."
  }
  $stdout = $stdoutTask.Result
  $stderr = $stderrTask.Result
  if ($Process.ExitCode -ne 0) { throw "Hook exited $($Process.ExitCode): $stderr" }
  return [pscustomobject]@{ stdout = $stdout; stderr = $stderr }
}

$hooks = Get-Content -Raw (Join-Path $root ".codex\hooks.json") | ConvertFrom-Json
foreach ($eventName in @("SessionStart", "PreToolUse", "PostToolUse", "Stop", "SessionEnd")) {
  $handlers = @($hooks.hooks.$eventName)
  if ($handlers.Count -ne 1 -or @($handlers[0].hooks).Count -ne 1) {
    throw "$eventName does not have exactly one dispatcher."
  }
  if ([string]$handlers[0].hooks[0].command -notmatch '(?i)\.tooling[/\\]runtimes[/\\]powershell-7\.6\.4[/\\]pwsh\.exe') {
    throw "$eventName does not use the pinned project PowerShell 7.6.4 runtime."
  }
}
$fixtureSource = Get-Content -Raw -LiteralPath $PSCommandPath
if ($fixtureSource -match 'FileName\s*=\s*"powershell\.exe"') { throw "Hook fixtures still launch legacy Windows PowerShell." }
$preMatcher = [regex]::new([string]$hooks.hooks.PreToolUse[0].matcher)
foreach ($writeTool in @("Bash", "apply_patch", "Edit", "Write")) {
  if ($preMatcher.IsMatch($writeTool)) { throw "PreToolUse must not dispatch for $writeTool." }
}

$dispatcherSource = Get-Content -Raw $dispatcher
if ($dispatcherSource -match "ProcessName -match '\^powershell\$'" -or $dispatcherSource -match "ProcessName -notmatch '\^powershell\$'") {
  throw "Watcher identity checks reject the pinned pwsh process."
}
$postToolUseBlock = [regex]::Match($dispatcherSource, '(?s)"PostToolUse"\s*\{(.*?)\n\s*\}\n\s*"Stop"').Groups[1].Value
$preToolUseBlock = [regex]::Match($dispatcherSource, '(?s)"PreToolUse"\s*\{(.*?)\n\s*\}\n\s*"PostToolUse"').Groups[1].Value
$stopBlock = [regex]::Match($dispatcherSource, '(?s)"Stop"\s*\{(.*?)\n\s*\}\n\s*"SessionEnd"').Groups[1].Value
if ($postToolUseBlock -match 'Invoke-GraphUpdate') {
  throw "PostToolUse must mark Graphify dirty, not run graphify update."
}
if ($preToolUseBlock -notmatch 'Invoke-GraphUpdateIfNeeded') {
  throw "Graphify PreToolUse must update only when the graph is dirty."
}
if ($stopBlock -notmatch 'Invoke-GraphUpdateIfNeeded') {
  throw "Stop must update only when the graph is dirty."
}

$marker = Join-Path $root ".tooling\state\serena\restart-required.json"
$hadMarker = Test-Path -LiteralPath $marker
$savedMarker = if ($hadMarker) { Get-Content -Raw $marker } else { $null }
try {
  [System.IO.File]::WriteAllText($marker, '{"fixture":true}')
  $pre = Complete-HookProcess (Invoke-HookProcess "PreToolUse" '{"tool_name":"mcp__serena__find_symbol"}')
  if ($pre.stdout -notmatch '"permissionDecision":"deny"') { throw "Serena restart guard did not deny symbolic work." }
} finally {
  if ($hadMarker) { [System.IO.File]::WriteAllText($marker, $savedMarker) }
  elseif (Test-Path -LiteralPath $marker) { Remove-Item -LiteralPath $marker -Force }
}

$stop = Complete-HookProcess (Invoke-HookProcess "Stop" '{"stop_hook_active":true}')
if ($stop.stdout.Trim()) { throw "Stop loop guard should not emit recursive context." }

$session = Complete-HookProcess (Invoke-HookProcess "SessionStart" '{"source":"startup"}')
try {
  if ($session.stdout -match 'ADHD MODE ACTIVE') { throw "SessionStart still injects the project ADHD skill despite the global installation." }
  if ((Get-Content -Raw -LiteralPath (Join-Path $root "AGENTS.md")) -notmatch 'ADHD response contract') { throw "AGENTS.md no longer provides the project ADHD fallback contract." }
} finally {
  Complete-HookProcess (Invoke-HookProcess "SessionEnd" '{}') 10000 | Out-Null
}

$graphDirtyPath = Join-Path $root ".tooling\state\graphify\dirty.json"
$hooksLogPath = Join-Path $root ".tooling\logs\hooks.log"
function Get-GraphifyUpdateCount {
  if (-not (Test-Path -LiteralPath $hooksLogPath)) { return 0 }
  return @((Get-Content -LiteralPath $hooksLogPath | Select-String -SimpleMatch "graphify update exit=")).Count
}

# Establish a fresh fingerprint once; subsequent read-only tools must stay cheap.
Complete-HookProcess (Invoke-HookProcess "PreToolUse" '{"tool_name":"mcp__graphify__query"}') | Out-Null
$updatesBeforeReadOnly = Get-GraphifyUpdateCount
$one = Invoke-HookProcess "PostToolUse" '{"tool_name":"Bash","tool_input":{"command":"hook fixture one"}}'
$two = Invoke-HookProcess "PostToolUse" '{"tool_name":"Bash","tool_input":{"command":"hook fixture two"}}'
Complete-HookProcess $one | Out-Null
Complete-HookProcess $two | Out-Null
$log = Get-Content -Raw $hooksLogPath
if ($log -match "Timed out waiting for tooling lock") { throw "Concurrent hook lock timed out." }
if ((Get-GraphifyUpdateCount) -ne $updatesBeforeReadOnly) { throw "Read-only PostToolUse unexpectedly updated Graphify." }
if (Test-Path -LiteralPath $graphDirtyPath) { throw "Read-only PostToolUse unexpectedly marked Graphify dirty." }

$dirtyFixture = Join-Path $root "tests\tooling\.graphify-hook-dirty-fixture.txt"
try {
  [System.IO.File]::WriteAllText($dirtyFixture, "dirty fixture`n")
  Complete-HookProcess (Invoke-HookProcess "PostToolUse" '{"tool_name":"apply_patch","tool_input":{"patch":"tests/tooling/.graphify-hook-dirty-fixture.txt"}}') | Out-Null
  if (-not (Test-Path -LiteralPath $graphDirtyPath)) { throw "A real file change did not mark Graphify dirty." }
  if ((Get-GraphifyUpdateCount) -ne $updatesBeforeReadOnly) { throw "PostToolUse updated Graphify instead of deferring it." }
} finally {
  if (Test-Path -LiteralPath $dirtyFixture) { Remove-Item -LiteralPath $dirtyFixture -Force }
  Complete-HookProcess (Invoke-HookProcess "PostToolUse" '{"tool_name":"Write","tool_input":{"file_path":"tests/tooling/.graphify-hook-dirty-fixture.txt"}}') | Out-Null
}
if (Test-Path -LiteralPath $graphDirtyPath) { throw "A reverted file change left Graphify dirty." }

# A dirty graph queried concurrently must update once; the waiter rechecks after
# acquiring the lock and coalesces instead of repeating the update.
[System.IO.File]::WriteAllText($graphDirtyPath, '{"fixture":true}')
$updatesBeforeCoalesce = Get-GraphifyUpdateCount
$queryOne = Invoke-HookProcess "PreToolUse" '{"tool_name":"mcp__graphify__query"}'
$queryTwo = Invoke-HookProcess "PreToolUse" '{"tool_name":"mcp__graphify__query"}'
Complete-HookProcess $queryOne | Out-Null
Complete-HookProcess $queryTwo | Out-Null
if ((Get-GraphifyUpdateCount) -ne ($updatesBeforeCoalesce + 1)) { throw "Concurrent Graphify queries were not coalesced into one update." }
if (Test-Path -LiteralPath $graphDirtyPath) { throw "Successful coalesced update did not clear Graphify dirty state." }

$freshnessScript = Join-Path $root "scripts\tooling\graphify-freshness.ps1"
$wrapper = Join-Path $root "scripts\tooling\invoke-graphify.ps1"
if (-not (Test-Path -LiteralPath $freshnessScript -PathType Leaf)) { throw "Graphify freshness module is missing." }
if (-not (Test-Path -LiteralPath $wrapper -PathType Leaf)) { throw "Graphify boundary wrapper is missing." }
foreach ($obsolete in @(".graphify-profile", "scripts\graphify-watch.ps1", "scripts\tooling\set-graphify-profile.ps1")) {
  if (Test-Path -LiteralPath (Join-Path $root $obsolete)) { throw "Obsolete Graphify profile/watch file remains: $obsolete" }
}

$dispatcherSource = Get-Content -Raw -LiteralPath $dispatcher
$wrapperSource = Get-Content -Raw -LiteralPath $wrapper
if ($dispatcherSource -notmatch 'graphify-freshness\.ps1') { throw "Hook dispatcher does not use the shared freshness gate." }
if ($dispatcherSource -match 'graphify-profile|needs_update|graphify-watch') { throw "Hook dispatcher still contains obsolete Graphify profile/watch/marker logic." }
if ($wrapperSource -notmatch 'Invoke-GraphUpdateIfNeeded') { throw "Graphify wrapper does not enforce AST freshness." }
if ($wrapperSource -notmatch 'Get-GraphifySemanticStatus') { throw "Graphify wrapper does not report semantic freshness at the boundary." }
foreach ($command in @("query", "path", "explain")) {
  if ($wrapperSource -notmatch [regex]::Escape('"' + $command + '"')) { throw "Graphify wrapper does not allow $command." }
}

. $freshnessScript
$semantic = Get-GraphifySemanticStatus
if ($semantic.PSObject.Properties.Name -notcontains "pending_count") { throw "Semantic status does not expose pending_count." }
if ($semantic.PSObject.Properties.Name -notcontains "pending_files") { throw "Semantic status does not expose pending_files." }

Write-Output "PASS hook fixtures: single dispatchers, Serena guard, ADHD fallback without duplicate injection, Stop loop guard, deferred dirty tracking, read-only skip, coalesced query update, shared boundary wrapper, semantic status, obsolete Graphify cleanup."
