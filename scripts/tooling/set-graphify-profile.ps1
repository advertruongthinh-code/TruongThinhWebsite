param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("boundary", "strict", "watch")]
  [string]$Profile
)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-ProjectRoot
$profilePath = Join-Path $root ".graphify-profile"
[System.IO.File]::WriteAllText($profilePath, $Profile + [Environment]::NewLine)
Write-Output "Graphify profile: $Profile"
if ($Profile -eq "watch") {
  Write-Output "Start scripts/graphify-watch.ps1 in a dedicated terminal or restart the Codex session."
}
