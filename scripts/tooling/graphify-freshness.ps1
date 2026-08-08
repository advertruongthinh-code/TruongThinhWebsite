. (Join-Path $PSScriptRoot "common.ps1")

function Get-GraphifyStatePath([string]$Name) {
  return Join-Path (Get-ProjectRoot) ".tooling\state\graphify\$Name"
}

function Write-GraphifyLog([string]$EventLabel, [string]$Message) {
  Initialize-ToolingState
  $label = if ($EventLabel) { $EventLabel } else { "Graphify" }
  $line = "$(Get-Date -Format o) [$label] $Message$([Environment]::NewLine)"
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($line)
  $logPath = Join-Path (Get-ProjectRoot) ".tooling\logs\hooks.log"
  $stream = [System.IO.File]::Open($logPath, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  try {
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
  } finally {
    $stream.Dispose()
  }
}

function Invoke-WithGraphifyLock([scriptblock]$Action) {
  Initialize-ToolingState
  $lockPath = Join-Path (Get-ProjectRoot) ".tooling\state\hooks\graphify.lock"
  $deadline = (Get-Date).AddSeconds(30)
  $stream = $null
  while (-not $stream -and (Get-Date) -lt $deadline) {
    try {
      $stream = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    } catch [System.IO.IOException] {
      Start-Sleep -Milliseconds 200
    }
  }
  if (-not $stream) { throw "Timed out waiting for tooling lock: graphify" }
  try { & $Action } finally { $stream.Dispose() }
}

function Get-GraphifyIgnorePatterns {
  $ignorePath = Join-Path (Get-ProjectRoot) ".graphifyignore"
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
  $root = Get-ProjectRoot
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

  $content = [System.Text.UTF8Encoding]::new($false).GetBytes((@($records | Sort-Object) -join "`n"))
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { $hash = $sha.ComputeHash($content) } finally { $sha.Dispose() }
  return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Get-StoredGraphFingerprint {
  $path = Get-GraphifyStatePath "fingerprint.txt"
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
  return (Get-Content -Raw -LiteralPath $path).Trim()
}

function Write-GraphFingerprint([string]$Fingerprint) {
  Initialize-ToolingState
  $path = Get-GraphifyStatePath "fingerprint.txt"
  $temporary = "$path.$PID.tmp"
  [System.IO.File]::WriteAllText($temporary, "$Fingerprint`n", [System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $path -Force
}

function Write-GraphDirtyMarker([string]$Fingerprint, [string]$Trigger, [string]$EventLabel) {
  Initialize-ToolingState
  $record = [ordered]@{
    dirty_at = (Get-Date).ToUniversalTime().ToString("o")
    event = $EventLabel
    trigger = $Trigger
    fingerprint = $Fingerprint
  }
  $path = Get-GraphifyStatePath "dirty.json"
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Compress))
  $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  try {
    $stream.SetLength(0)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
  } finally {
    $stream.Dispose()
  }
}

function Test-GraphUpdateRequired {
  if (Test-Path -LiteralPath (Get-GraphifyStatePath "dirty.json")) { return $true }
  $stored = Get-StoredGraphFingerprint
  if (-not $stored) { return $true }
  return (Get-GraphCorpusFingerprint) -ne $stored
}

function Mark-GraphDirtyIfChanged([string]$Trigger, [string]$EventLabel = "PostToolUse") {
  $current = Get-GraphCorpusFingerprint
  $stored = Get-StoredGraphFingerprint
  $dirtyPath = Get-GraphifyStatePath "dirty.json"
  if ($stored -and $current -eq $stored) {
    if (Test-Path -LiteralPath $dirtyPath) { Remove-Item -LiteralPath $dirtyPath -Force }
    Write-GraphifyLog $EventLabel "graphify unchanged after $Trigger; no dirty marker"
    return $false
  }
  Write-GraphDirtyMarker $current $Trigger $EventLabel
  Write-GraphifyLog $EventLabel "graphify marked dirty after $Trigger fingerprint=$current"
  return $true
}

function Invoke-GraphUpdateIfNeeded([string]$EventLabel = "GraphifyWrapper") {
  if (-not (Test-GraphUpdateRequired)) {
    Write-GraphifyLog $EventLabel "graphify fresh; update skipped"
    return [pscustomobject]@{ required = $false; updated = $false; fresh = $true; message = "Graphify AST is fresh."; exit_code = 0 }
  }

  try {
    return Invoke-WithGraphifyLock {
      if (-not (Test-GraphUpdateRequired)) {
        Write-GraphifyLog $EventLabel "graphify refreshed by another process; update coalesced"
        return [pscustomobject]@{ required = $true; updated = $false; fresh = $true; message = "Graphify AST was refreshed by another process."; exit_code = 0 }
      }

      $root = Get-ProjectRoot
      $before = Get-GraphCorpusFingerprint
      $previousErrorActionPreference = $ErrorActionPreference
      try {
        $ErrorActionPreference = "Continue"
        $output = & (Get-GraphifyExe) update $root 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
      } finally {
        $ErrorActionPreference = $previousErrorActionPreference
      }
      Write-GraphifyLog $EventLabel "graphify update exit=$exitCode $($output.Trim())"
      if ($exitCode -ne 0) {
        Write-GraphDirtyMarker $before "update-failed" $EventLabel
        return [pscustomobject]@{ required = $true; updated = $false; fresh = $false; message = "Graphify AST update failed. Inspect .tooling/logs/hooks.log."; exit_code = $exitCode }
      }

      $after = Get-GraphCorpusFingerprint
      if ($after -ne $before) {
        Write-GraphDirtyMarker $after "changed-during-update" $EventLabel
        return [pscustomobject]@{ required = $true; updated = $true; fresh = $false; message = "Files changed during the Graphify update; retry freshness before querying."; exit_code = 0 }
      }

      Write-GraphFingerprint $after
      $dirtyPath = Get-GraphifyStatePath "dirty.json"
      if (Test-Path -LiteralPath $dirtyPath) { Remove-Item -LiteralPath $dirtyPath -Force }
      return [pscustomobject]@{ required = $true; updated = $true; fresh = $true; message = "Graphify AST was updated."; exit_code = 0 }
    }
  } catch {
    Write-GraphifyLog $EventLabel "graphify update error: $($_.Exception.Message)"
    return [pscustomobject]@{ required = $true; updated = $false; fresh = $false; message = "Graphify AST update failed: $($_.Exception.Message)"; exit_code = 1 }
  }
}

function Get-GraphifySemanticStatus {
  Initialize-ToolingState
  $root = Get-ProjectRoot
  $manifest = Join-Path $root "graphify-out\manifest.json"
  if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
    return [pscustomobject]@{ available = $false; pending_count = $null; pending_files = @(); pending_by_type = [pscustomobject]@{}; error = "Graphify manifest is missing." }
  }

  $manifestInfo = Get-Item -LiteralPath $manifest
  $helper = Join-Path $PSScriptRoot "graphify-semantic-status.py"
  $detectModule = Join-Path $root ".tooling\python\Lib\site-packages\graphify\detect.py"
  $helperInfo = Get-Item -LiteralPath $helper
  $detectInfo = Get-Item -LiteralPath $detectModule
  $sourceKey = @(
    $manifestInfo.Length, $manifestInfo.LastWriteTimeUtc.Ticks,
    $helperInfo.Length, $helperInfo.LastWriteTimeUtc.Ticks,
    $detectInfo.Length, $detectInfo.LastWriteTimeUtc.Ticks
  ) -join "|"
  $cachePath = Get-GraphifyStatePath "semantic-status.json"
  if (Test-Path -LiteralPath $cachePath -PathType Leaf) {
    try {
      $cached = Get-Content -Raw -LiteralPath $cachePath | ConvertFrom-Json
      if ($cached.source_key -eq $sourceKey) { return $cached }
    } catch {}
  }

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $rawStatus = & (Get-ProjectPython) $helper $root $manifest 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    return [pscustomobject]@{ available = $false; pending_count = $null; pending_files = @(); pending_by_type = [pscustomobject]@{}; error = $rawStatus.Trim() }
  }

  try {
    $status = $rawStatus.Trim() | ConvertFrom-Json
    $status | Add-Member -NotePropertyName source_key -NotePropertyValue $sourceKey
    $temporary = "$cachePath.$PID.tmp"
    [System.IO.File]::WriteAllText($temporary, (($status | ConvertTo-Json -Depth 8) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporary -Destination $cachePath -Force
    return $status
  } catch {
    return [pscustomobject]@{ available = $false; pending_count = $null; pending_files = @(); pending_by_type = [pscustomobject]@{}; error = "Invalid semantic status output: $($_.Exception.Message)" }
  }
}
