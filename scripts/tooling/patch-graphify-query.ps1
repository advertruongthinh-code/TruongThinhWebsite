param(
  [string]$Python
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

if (-not $Python) {
  $Python = Join-Path (Get-GlobalToolingRoot) "python\Scripts\python.exe"
}
if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) {
  throw "Graphify Python is missing: $Python"
}

$modulePath = (& $Python -c "import graphify.cli; print(graphify.cli.__file__)" | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $modulePath -PathType Leaf)) {
  throw "Installed graphify.cli could not be located."
}

$source = Get-Content -Raw -LiteralPath $modulePath
$importPattern = '(?m)^        from graphify\.paths import write_text_atomic\r?\n'
$callPattern = '(?m)^        write_text_atomic\(stamp, str\(time\.time\(\)\)\)$'
$directCall = '        stamp.write_text(str(time.time()), encoding="utf-8")'

if ($source.Contains($directCall) -and $source -notmatch $importPattern) {
  Write-Output "Graphify query stamp patch already applied: $modulePath"
  exit 0
}
if ([regex]::Matches($source, $importPattern).Count -ne 1 -or [regex]::Matches($source, $callPattern).Count -ne 1) {
  throw "Graphify query stamp source no longer matches the verified patch target: $modulePath"
}

$backupRoot = Join-Path (Get-GlobalToolingRoot) ("backups\graphify-query-stamp-" + (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ"))
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
Copy-Item -LiteralPath $modulePath -Destination (Join-Path $backupRoot "cli.py")

$updated = [regex]::Replace($source, $importPattern, "")
$updated = [regex]::Replace($updated, $callPattern, $directCall)
[System.IO.File]::WriteAllText($modulePath, $updated, (New-Object System.Text.UTF8Encoding($false)))

& $Python -m py_compile $modulePath
if ($LASTEXITCODE -ne 0) { throw "Patched graphify.cli failed to compile; backup: $backupRoot" }

Write-Output "Graphify query stamp patched: $modulePath"
Write-Output "Backup: $backupRoot"
