param(
  [ValidateSet("install", "run")]
  [string]$Action = "install",
  [ValidateSet("pre-commit", "pre-push")]
  [string]$Hook,
  [string]$RemoteName,
  [string]$RemoteUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Action -eq "install") {
  # Hooks live in the common Git dir, so worktrees install the same shared hooks.
  $hooksDirectory = Join-Path (& git -C $PSScriptRoot rev-parse --path-format=absolute --git-common-dir).Trim() "hooks"
  $scriptPath = $PSCommandPath.Replace("\", "/")
  foreach ($name in @("pre-commit", "pre-push")) {
    $path = Join-Path $hooksDirectory $name
    if ((Test-Path -LiteralPath $path) -and -not (Select-String -LiteralPath $path -SimpleMatch "ponytail-git-hooks.ps1" -Quiet)) {
      throw "Refusing to overwrite an unmanaged Git hook: $path"
    }
    $remoteArguments = if ($name -eq "pre-push") { ' -RemoteName "$1" -RemoteUrl "$2"' } else { "" }
    $body = "#!/bin/sh`nexec pwsh -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -Action run -Hook $name$remoteArguments`n"
    [System.IO.File]::WriteAllText($path, $body, [System.Text.UTF8Encoding]::new($false))
    Write-Output "${name}: installed"
  }
  exit 0
}

if (-not $Hook) { throw "-Hook is required for -Action run." }
$scope = if ($Hook -eq "pre-commit") {
  "Review only the staged diff returned by git diff --cached. Ignore unstaged and untracked work."
} else {
  @"
Review only the net change of these pre-push ref updates with git diff remote_sha local_sha.
Each ref line is: local_ref local_sha remote_ref remote_sha. Remote: $RemoteName $RemoteUrl
$([Console]::In.ReadToEnd().Trim())
"@
}
$prompt = @"
/ponytail-review
$scope
Review at ponytail full level, not ultra, regardless of repository rules.
The full level and the 20-line block threshold are owner decisions; do not propose removing them.
Use the ponytail-review format and boundaries. Do not edit files, commit, push, or invoke another agent.
If there is nothing to cut, make the final response exactly: Lean already. Ship.
If there are findings, end with: net: -<N> lines possible.
"@

$result = (& claude -p $prompt --output-format text --no-session-persistence `
  --allowedTools "Read" "Grep" "Glob" "Skill" "Bash(git diff:*)" "Bash(git show:*)" "Bash(git log:*)" 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw "Claude ponytail-review failed with exit code $LASTEXITCODE.`n$result" }
# Owner gate: block only when the review can cut more than 20 lines; unparseable output fails closed.
$net = [regex]::Match($result, "net: -(\d+) lines possible\.?\s*$")
if (-not $result.EndsWith("Lean already. Ship.") -and (-not $net.Success -or [int]$net.Groups[1].Value -gt 20)) {
  throw "Ponytail review blocks Git (net cut over 20 lines or unreadable result). Fix the findings, stage the result, and retry Git.`n$result"
}
Write-Output $result
