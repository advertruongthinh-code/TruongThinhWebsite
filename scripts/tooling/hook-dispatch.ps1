param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("SessionStart", "PreToolUse", "PostToolUse", "Stop", "SessionEnd")]
  [string]$Event
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
Initialize-ToolingState
$raw = [Console]::In.ReadToEnd()
$payload = if ($raw.Trim()) { $raw | ConvertFrom-Json } else { [pscustomobject]@{} }
$context = [System.Collections.Generic.List[string]]::new()
$systemMessages = [System.Collections.Generic.List[string]]::new()
$decision = $null
$reason = $null
$logPath = Join-Path $root ".tooling\logs\hooks.log"
$graphStateDirectory = Join-Path $root ".tooling\state\graphify"
$graphDirtyPath = Join-Path $graphStateDirectory "dirty.json"
$graphFingerprintPath = Join-Path $graphStateDirectory "fingerprint.txt"

function Write-Log([string]$Message) {
  $line = "$(Get-Date -Format o) [$Event] $Message$([Environment]::NewLine)"
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($line)
  $stream = [System.IO.File]::Open($logPath, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  try {
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
  } finally {
    $stream.Dispose()
  }
}

function Add-HookContext([string]$Message) {
  if ($Message -and -not $context.Contains($Message)) { $context.Add($Message) }
}

function Invoke-WithToolLock([string]$Name, [scriptblock]$Action) {
  $lockPath = Join-Path $root ".tooling\state\hooks\$Name.lock"
  $deadline = (Get-Date).AddSeconds(30)
  $stream = $null
  while (-not $stream -and (Get-Date) -lt $deadline) {
    try {
      $stream = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    } catch [System.IO.IOException] { Start-Sleep -Milliseconds 200 }
  }
  if (-not $stream) { throw "Timed out waiting for tooling lock: $Name" }
  try { & $Action } finally { $stream.Dispose() }
}

function Get-GraphifyIgnorePatterns {
  $ignorePath = Join-Path $root ".graphifyignore"
  if (-not (Test-Path -LiteralPath $ignorePath -PathType Leaf)) { return @() }
  return @(Get-Content -LiteralPath $ignorePath | ForEach-Object { $_.Trim().Replace("\", "/").TrimStart("/") } | Where-Object { $_ -and -not $_.StartsWith("#") })
}

function Test-GraphifyIgnored([string]$RelativePath, [string[]]$Patterns) {
  $candidate = $RelativePath.Replace("\", "/").TrimStart("/")
  foreach ($pattern in $Patterns) {
    if ($pattern.EndsWith("/**")) {
      $prefix = $pattern.Substring(0, $pattern.Length - 3).TrimEnd("/")
      if ($candidate -eq $prefix -or $candidate.StartsWith("$prefix/", [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
      continue
    }
    if ($candidate -like $pattern) { return $true }
  }
  return $false
}

function Get-GraphCorpusFingerprint {
  $patterns = @(Get-GraphifyIgnorePatterns)
  $records = [System.Collections.Generic.List[string]]::new()
  $directories = [System.Collections.Generic.Stack[System.IO.DirectoryInfo]]::new()
  $directories.Push([System.IO.DirectoryInfo]::new($root))

  while ($directories.Count -gt 0) {
    $directory = $directories.Pop()
    try { $entries = @($directory.GetFileSystemInfos()) } catch { continue }
    foreach ($entry in $entries) {
      $relative = $entry.FullName.Substring($root.Length).TrimStart([char[]]@('\', '/')).Replace("\", "/")
      if (Test-GraphifyIgnored $relative $patterns) { continue }
      if ($entry -is [System.IO.DirectoryInfo]) {
        if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -eq 0) { $directories.Push($entry) }
        continue
      }
      $records.Add("$relative|$($entry.Length)|$($entry.LastWriteTimeUtc.Ticks)")
    }
  }

  $sorted = @($records | Sort-Object)
  $content = [System.Text.UTF8Encoding]::new($false).GetBytes(($sorted -join "`n"))
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { $hash = $sha.ComputeHash($content) } finally { $sha.Dispose() }
  return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Get-StoredGraphFingerprint {
  if (-not (Test-Path -LiteralPath $graphFingerprintPath -PathType Leaf)) { return $null }
  return (Get-Content -Raw -LiteralPath $graphFingerprintPath).Trim()
}

function Write-GraphFingerprint([string]$Fingerprint) {
  $temporary = "$graphFingerprintPath.$PID.tmp"
  [System.IO.File]::WriteAllText($temporary, "$Fingerprint`n", [System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $graphFingerprintPath -Force
}

function Write-GraphDirtyMarker([string]$Fingerprint, [string]$Trigger) {
  $record = [ordered]@{
    dirty_at = (Get-Date).ToUniversalTime().ToString("o")
    event = $Event
    trigger = $Trigger
    fingerprint = $Fingerprint
  }
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Compress))
  $stream = [System.IO.File]::Open($graphDirtyPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  try {
    $stream.SetLength(0)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
  } finally {
    $stream.Dispose()
  }
}

function Test-GraphUpdateRequired {
  if (Test-Path -LiteralPath $graphDirtyPath) { return $true }
  $stored = Get-StoredGraphFingerprint
  if (-not $stored) { return $true }
  return (Get-GraphCorpusFingerprint) -ne $stored
}

function Mark-GraphDirtyIfChanged([string]$Trigger) {
  $current = Get-GraphCorpusFingerprint
  $stored = Get-StoredGraphFingerprint
  if ($stored -and $current -eq $stored) {
    if (Test-Path -LiteralPath $graphDirtyPath) { Remove-Item -LiteralPath $graphDirtyPath -Force }
    Write-Log "graphify unchanged after $Trigger; no dirty marker"
    return $false
  }
  Write-GraphDirtyMarker $current $Trigger
  Write-Log "graphify marked dirty after $Trigger fingerprint=$current"
  return $true
}

function Invoke-GraphUpdateIfNeeded {
  if (-not (Test-GraphUpdateRequired)) {
    Write-Log "graphify fresh; update skipped"
    return $false
  }
  try {
    return [bool](Invoke-WithToolLock "graphify" {
      # Recheck after acquiring the lock so concurrent hook processes coalesce.
      if (-not (Test-GraphUpdateRequired)) {
        Write-Log "graphify refreshed by another hook; update coalesced"
        return $false
      }
      $before = Get-GraphCorpusFingerprint
      $previousErrorActionPreference = $ErrorActionPreference
      try {
        # Graphify emits informational warnings on stderr even when exit code is 0.
        # Capture them without letting PowerShell promote them to terminating errors.
        $ErrorActionPreference = "Continue"
        $output = & (Get-GraphifyExe) update $root 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
      } finally {
        $ErrorActionPreference = $previousErrorActionPreference
      }
      Write-Log "graphify update exit=$exitCode $($output.Trim())"
      if ($exitCode -ne 0) {
        Write-GraphDirtyMarker $before "update-failed"
        Add-HookContext "Graphify update failed. Inspect .tooling/logs/hooks.log before claiming the graph is fresh."
        return $false
      }

      $after = Get-GraphCorpusFingerprint
      if ($after -ne $before) {
        Write-GraphDirtyMarker $after "changed-during-update"
        Add-HookContext "Files changed while Graphify was updating; graph remains dirty and will be coalesced into the next refresh."
        return $false
      }
      Write-GraphFingerprint $after
      if (Test-Path -LiteralPath $graphDirtyPath) { Remove-Item -LiteralPath $graphDirtyPath -Force }
      return $true
    })
  } catch {
    Write-Log "graphify update error: $($_.Exception.Message)"
    Add-HookContext "Graphify update failed. Do not claim graph freshness."
    return $false
  }
}

function Mark-SemanticStale {
  if ($raw -notmatch '(?i)(\.mdx?\b|\.(png|jpe?g|webp|gif|svg|avif)\b|assets[\\/]|docs[\\/])') { return }
  $flag = Join-Path $root "graphify-out\needs_update"
  [System.IO.File]::WriteAllText($flag, "semantic update required`n")
  Add-HookContext "Graphify semantic update is required for changed documentation/media; the AST refresh is deferred until the next Graphify query or Stop."
}

function Invoke-SerenaSync {
  try {
    $syncRaw = & (Join-Path $PSScriptRoot "sync-serena-languages.ps1") -Apply 2>&1 | Out-String
    Write-Log "serena sync: $($syncRaw.Trim())"
    $jsonLines = @($syncRaw -split "`r?`n" | Where-Object { $_.Trim().StartsWith("{") })
    if ($jsonLines.Count -gt 0) {
      $sync = $jsonLines[-1] | ConvertFrom-Json
      if ($sync.applied) { Add-HookContext "Serena language set changed to: $($sync.languages -join ', '). Reactivate the project and reconnect Serena MCP if required." }
    }
  } catch {
    Write-Log "serena sync error: $($_.Exception.Message)"
    Add-HookContext "Serena language synchronization failed; do not use stale symbolic results."
  }
}

function Invoke-Impeccable {
  $hook = Join-Path $root ".agents\skills\impeccable\scripts\hook.mjs"
  if (-not (Test-Path -LiteralPath $hook)) { return }
  try {
    $node = Get-ProjectNode
    $stderrPath = Join-Path $root ".tooling\logs\impeccable-$PID-$([guid]::NewGuid().ToString('N')).log"
    $hookOutput = $raw | & $node $hook 2> $stderrPath | Out-String
    if ((Test-Path -LiteralPath $stderrPath) -and (Get-Item -LiteralPath $stderrPath).Length -gt 0) {
      Write-Log "impeccable stderr: $((Get-Content -Raw -LiteralPath $stderrPath).Trim())"
    }
    if (Test-Path -LiteralPath $stderrPath) { Remove-Item -LiteralPath $stderrPath -Force }
    if (-not $hookOutput.Trim()) { return }
    $result = $hookOutput | ConvertFrom-Json
    if (($result.PSObject.Properties.Name -contains "systemMessage") -and $result.systemMessage) { $systemMessages.Add([string]$result.systemMessage) }
    if (($result.PSObject.Properties.Name -contains "reason") -and $result.reason) { Add-HookContext([string]$result.reason) }
    if (($result.PSObject.Properties.Name -contains "hookSpecificOutput") -and $result.hookSpecificOutput -and ($result.hookSpecificOutput.PSObject.Properties.Name -contains "additionalContext") -and $result.hookSpecificOutput.additionalContext) {
      Add-HookContext([string]$result.hookSpecificOutput.additionalContext)
    }
    if ($result.decision -eq "block") {
      $script:decision = "block"
      $script:reason = [string]$result.reason
    }
  } catch {
    Write-Log "impeccable hook error: $($_.Exception.Message)"
    Add-HookContext "Impeccable detector failed; run a manual detector before claiming UI QA passed."
  }
}

function Start-SessionWatcher([string]$Name, [string]$ScriptPath, [string[]]$Arguments) {
  $pidPath = Join-Path $root ".tooling\state\hooks\$Name.pid"
  if (Test-Path -LiteralPath $pidPath) {
    try {
      $record = Get-Content -Raw $pidPath | ConvertFrom-Json
      $existing = [int]$record.pid
      $existingProcess = Get-Process -Id $existing -ErrorAction SilentlyContinue
      if ($existingProcess -and $existingProcess.ProcessName -match '^(powershell|pwsh)$') { return }
    } catch {}
  }
  $argumentList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $ScriptPath) + $Arguments
  $process = Start-Process -FilePath (Join-Path (Get-ProjectPwshDirectory) "pwsh.exe") -ArgumentList $argumentList -WindowStyle Hidden -PassThru
  $record = [ordered]@{ pid = $process.Id; started_at = $process.StartTime.ToUniversalTime().ToString("o"); script = $ScriptPath }
  [System.IO.File]::WriteAllText($pidPath, ($record | ConvertTo-Json -Compress))
}

function Stop-SessionWatcher([string]$Name) {
  $pidPath = Join-Path $root ".tooling\state\hooks\$Name.pid"
  if (-not (Test-Path -LiteralPath $pidPath)) { return }
  try {
    $record = Get-Content -Raw $pidPath | ConvertFrom-Json
    $processId = [int]$record.pid
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
      $expectedStart = [datetime]$record.started_at
      $startDelta = [math]::Abs(($process.StartTime.ToUniversalTime() - $expectedStart.ToUniversalTime()).TotalSeconds)
      if ($process.ProcessName -notmatch '^(powershell|pwsh)$' -or $startDelta -gt 5) { throw "Watcher PID identity mismatch: $processId" }
      & taskkill.exe /PID $processId /T /F 2>&1 | Out-Null
    }
    Remove-Item -LiteralPath $pidPath -Force
  } catch { Write-Log "watcher cleanup error: $($_.Exception.Message)" }
}

try {
  switch ($Event) {
    "SessionStart" {
      try {
        $doctor = & (Join-Path $PSScriptRoot "doctor.ps1") -Quick 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { Add-HookContext "Project tooling doctor found a problem. Inspect .tooling/logs/hooks.log." }
        Write-Log "quick doctor: $($doctor.Trim())"
      } catch { Write-Log "quick doctor error: $($_.Exception.Message)" }
      Invoke-SerenaSync
      Start-SessionWatcher "serena-language-watch" (Join-Path $PSScriptRoot "sync-serena-languages.ps1") @("-Watch")
      $profile = (Get-Content -Raw (Join-Path $root ".graphify-profile")).Trim()
      if ($profile -eq "watch") { Start-SessionWatcher "graphify-watch" (Join-Path $root "scripts\graphify-watch.ps1") @() }
      try {
        $updates = & (Join-Path $PSScriptRoot "check-updates.ps1") -IfDue 2>&1 | Out-String
        if ($updates.Trim()) { Add-HookContext $updates.Trim() }
      } catch { Write-Log "update check error: $($_.Exception.Message)" }

    }
    "PreToolUse" {
      $tool = [string]$payload.tool_name
      $restart = Join-Path $root ".tooling\state\serena\restart-required.json"
      if ($tool -match "^mcp__serena__" -and (Test-Path -LiteralPath $restart)) {
        $output = [ordered]@{
          hookSpecificOutput = [ordered]@{
            hookEventName = "PreToolUse"
            permissionDecision = "deny"
            permissionDecisionReason = "Serena languages changed. Reactivate the project or reconnect the Serena MCP server, verify the configured languages, then clear the restart marker."
          }
        }
        [Console]::Out.Write(($output | ConvertTo-Json -Depth 8 -Compress))
        exit 0
      }
      if ($tool -match "^mcp__graphify__") {
        Invoke-GraphUpdateIfNeeded | Out-Null
        if ((Get-Content -Raw (Join-Path $root ".graphify-profile")).Trim() -eq "strict" -and (Test-Path (Join-Path $root "graphify-out\needs_update"))) {
          $output = [ordered]@{
            hookSpecificOutput = [ordered]@{
              hookEventName = "PreToolUse"
              permissionDecision = "deny"
              permissionDecisionReason = "Graphify semantic data is stale. Run an approved semantic update or use AST-only results with an explicit stale warning."
            }
          }
          [Console]::Out.Write(($output | ConvertTo-Json -Depth 8 -Compress))
          exit 0
        }
      }
    }
    "PostToolUse" {
      $tool = [string]$payload.tool_name
      if ($tool -match "^(Bash|apply_patch|Edit|Write)$" -and (Mark-GraphDirtyIfChanged $tool)) {
        Invoke-SerenaSync
        Invoke-Impeccable
        Mark-SemanticStale
      }
      if (Test-Path -LiteralPath (Join-Path $root "graphify-out\needs_update")) {
        Add-HookContext "Graphify semantic update is required for changed documentation/media; AST freshness is tracked separately."
      }
    }
    "Stop" {
      if (($payload.PSObject.Properties.Name -contains "stop_hook_active") -and $payload.stop_hook_active) {
        Write-Log "Stop loop guard active; skipping recursive final pass."
        break
      }
      Invoke-GraphUpdateIfNeeded | Out-Null
      Invoke-Impeccable
      if (Test-Path -LiteralPath (Join-Path $root "graphify-out\needs_update")) {
        Add-HookContext "Graphify semantic update remains required; do not report a fully fresh semantic graph."
      }
      if (Test-Path -LiteralPath (Join-Path $root ".tooling\state\serena\restart-required.json")) {
        Add-HookContext "Serena MCP reactivation remains required after a language-set change."
      }
    }
    "SessionEnd" {
      Stop-SessionWatcher "serena-language-watch"
      Stop-SessionWatcher "graphify-watch"
    }
  }
} catch {
  Write-Log "dispatcher error: $($_.Exception.Message)"
  $systemMessages.Add("Project tooling hook failed; inspect .tooling/logs/hooks.log.")
}

$output = [ordered]@{}
if ($systemMessages.Count -gt 0) { $output.systemMessage = ($systemMessages -join "`n") }
if ($decision) { $output.decision = $decision; $output.reason = $reason }
if ($context.Count -gt 0) {
  $output.hookSpecificOutput = [ordered]@{ hookEventName = $Event; additionalContext = ($context -join "`n`n") }
}
if ($output.Count -gt 0) { [Console]::Out.Write(($output | ConvertTo-Json -Depth 8 -Compress)) }
exit 0
