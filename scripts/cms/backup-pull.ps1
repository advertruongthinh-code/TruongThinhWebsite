# Weekly copy of the private CMS bucket (D1 exports and media originals) to the owner's PC, then to the NAS
# (CMS plan Q11, task S5). The read-only R2 token lives in the rclone config on the PC as remote "r2cms", never in the repo.
# Register once: see docs/operations/cms-storage-runbook.md, section "Sao lưu".
param(
  [Parameter(Mandatory = $true)][string]$NasPath,
  [string]$LocalPath = "E:\TruongThinhBackup\cms\originals"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $NasPath)) { throw "NAS path not reachable: $NasPath" }
$nasTarget = Join-Path $NasPath "cms-originals"

# Copy, never mirror: a bad prune or a wiped bucket must not delete the PC and NAS copies.
rclone copy "r2cms:truong-thinh-media-originals" $LocalPath
if ($LASTEXITCODE -ne 0) { throw "rclone copy failed with exit code $LASTEXITCODE" }

# Robocopy exit codes below 8 mean success (0 nothing copied, 1 files copied, 2-7 extra or mismatched files).
robocopy $LocalPath $nasTarget /E /R:2 /W:10 /NP
if ($LASTEXITCODE -ge 8) { throw "robocopy to the NAS failed with exit code $LASTEXITCODE" }
exit 0
