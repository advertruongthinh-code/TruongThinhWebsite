$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$graphify = Join-Path $projectRoot ".tooling\python\Scripts\graphify.exe"

if (-not (Test-Path -LiteralPath $graphify -PathType Leaf)) {
  throw "Không tìm thấy Graphify project-local. Hãy chạy scripts/tooling/bootstrap.ps1 trước."
}

& $graphify watch $projectRoot
exit $LASTEXITCODE
