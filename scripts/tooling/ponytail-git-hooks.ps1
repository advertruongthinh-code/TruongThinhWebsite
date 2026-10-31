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
  # Hook nằm trong thư mục Git chung, nên các worktree cài cùng hook dùng chung.
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
  "Review only the staged code diff returned by git diff --cached -- . ':(exclude)*.md'. Ignore unstaged and untracked work."
} else {
  @"
Review only the net code change of these pre-push ref updates with git diff remote_sha local_sha -- . ':(exclude)*.md'.
Each ref line is: local_ref local_sha remote_ref remote_sha. Remote: $RemoteName $RemoteUrl
$([Console]::In.ReadToEnd().Trim())
"@
}
$prompt = @"
/ponytail-review
$scope
Review at ponytail ultra level.
The ultra level and the 20-line block threshold are owner decisions; do not propose removing them.
Markdown docs and plans are out of scope; ponytail reviews code, not prose.
Use the ponytail-review format and boundaries. Do not edit files, commit, push, or invoke another agent.
If there is nothing to cut, make the final response exactly: Lean already. Ship.
If there are findings, end with: net: -<N> lines possible.
"@

$result = (& claude -p $prompt --output-format text --no-session-persistence `
  --allowedTools "Read" "Grep" "Glob" "Skill" "Bash(git diff:*)" "Bash(git show:*)" "Bash(git log:*)" 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw "Claude ponytail-review failed with exit code $LASTEXITCODE.`n$result" }
# Owner gate: chỉ chặn khi review có thể cắt hơn 20 dòng; output không parse được thì fail closed.
# Nhận mọi dạng kết luận ponytail-review in ra ("Looks good. Ship.", "Verdict: Ship.", "Lean already. Ship.",
# kèm dòng "Checked:"/"Not checked:" phía sau); bỏ * và ` của Markdown trước khi so.
$plain = $result -replace '[*`]', ''
$net = [regex]::Match($plain, "(?im)^\s*(?:net|lean):\s*-(\d+) lines? possible")
$ship = [regex]::IsMatch($plain, "(?im)^\s*(?:Looks good|Lean already|Verdict:)\s*\.?\s*Ship\.")
if (($net.Success -and [int]$net.Groups[1].Value -gt 20) -or (-not $net.Success -and -not $ship)) {
  throw "Ponytail review blocks Git (net cut over 20 lines or unreadable result). Fix the findings, stage the result, and retry Git.`n$result"
}
Write-Output $result
