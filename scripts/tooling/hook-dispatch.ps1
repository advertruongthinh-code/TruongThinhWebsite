param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("SessionStart", "PreToolUse", "PostToolUse", "Stop", "SessionEnd")]
  [string]$Event
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "graphify-freshness.ps1")
$root = Get-ProjectRoot
Initialize-ToolingState
$raw = [Console]::In.ReadToEnd()
$payload = if ($raw.Trim()) { $raw | ConvertFrom-Json } else { [pscustomobject]@{} }
$context = [System.Collections.Generic.List[string]]::new()
$systemMessages = [System.Collections.Generic.List[string]]::new()
$decision = $null
$reason = $null
$logPath = Join-Path $root ".tooling\logs\hooks.log"

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
        $freshness = Invoke-GraphUpdateIfNeeded -EventLabel $Event
        if (-not $freshness.fresh) {
          $output = [ordered]@{
            hookSpecificOutput = [ordered]@{
              hookEventName = "PreToolUse"
              permissionDecision = "deny"
              permissionDecisionReason = $freshness.message
            }
          }
          [Console]::Out.Write(($output | ConvertTo-Json -Depth 8 -Compress))
          exit 0
        }
        $semantic = Get-GraphifySemanticStatus
        if (-not $semantic.available) {
          Add-HookContext "Graphify boundary: AST is fresh, but semantic freshness could not be determined. $($semantic.error)"
        } elseif ([int]$semantic.pending_count -gt 0) {
          Add-HookContext "Graphify boundary: AST is fresh; semantic update required for $($semantic.pending_count) docs/media file(s). Structural queries may continue."
        }
      }
    }
    "PostToolUse" {
      $tool = [string]$payload.tool_name
      if ($tool -match "^(Bash|apply_patch|Edit|Write)$" -and (Mark-GraphDirtyIfChanged $tool $Event)) {
        Invoke-SerenaSync
        Invoke-Impeccable
      }
    }
    "Stop" {
      if (($payload.PSObject.Properties.Name -contains "stop_hook_active") -and $payload.stop_hook_active) {
        Write-Log "Stop loop guard active; skipping recursive final pass."
        break
      }
      $freshness = Invoke-GraphUpdateIfNeeded -EventLabel $Event
      if (-not $freshness.fresh) { Add-HookContext $freshness.message }
      Invoke-Impeccable
      $semantic = Get-GraphifySemanticStatus
      if (-not $semantic.available) {
        Add-HookContext "Graphify boundary: semantic freshness could not be determined. $($semantic.error)"
      } elseif ([int]$semantic.pending_count -gt 0) {
        Add-HookContext "Graphify semantic update remains required for $($semantic.pending_count) docs/media file(s); AST freshness is tracked separately."
      }
      if (Test-Path -LiteralPath (Join-Path $root ".tooling\state\serena\restart-required.json")) {
        Add-HookContext "Serena MCP reactivation remains required after a language-set change."
      }
    }
    "SessionEnd" {
      Stop-SessionWatcher "serena-language-watch"
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
