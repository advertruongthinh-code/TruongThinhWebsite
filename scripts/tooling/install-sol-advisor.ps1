param([switch]$SkipTests)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")
$projectRoot = Get-ProjectRoot
$globalRoot = Get-GlobalToolingRoot
$pins = Get-Content -Raw (Join-Path $projectRoot "tooling-versions.json") | ConvertFrom-Json
$source = $pins.sol_advisor
$vendor = Join-Path $globalRoot "vendor\sol-advisor"
$pluginRoot = Join-Path $vendor "plugins\sol-advisor"
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupRoot = Join-Path $globalRoot "backups\sol-advisor-$stamp"

function Write-Utf8Atomic([string]$Path, [string]$Content) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
  [System.IO.File]::WriteAllText($temporary, $Content, (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Get-GitSh {
  $command = Get-Command sh -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $git = (Get-Command git -ErrorAction Stop).Source
  $gitRoot = Split-Path -Parent (Split-Path -Parent $git)
  $candidate = Join-Path $gitRoot "bin\sh.exe"
  if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
  throw "Git Bash sh.exe is required by the Sol Advisor upstream verifier and agent installer."
}

function Install-Jq {
  $runtime = $pins.runtimes.jq
  $binRoot = Join-Path $globalRoot "bin"
  $destination = Join-Path $binRoot "jq.exe"
  New-Item -ItemType Directory -Force -Path $binRoot | Out-Null

  if (Test-Path -LiteralPath $destination -PathType Leaf) {
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash.ToLowerInvariant()
    if ($actual -eq [string]$runtime.sha256) {
      $env:PATH = "$binRoot;$env:PATH"
      return
    }
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    Move-Item -LiteralPath $destination -Destination (Join-Path $backupRoot "jq-before-replace.exe")
  }

  $download = Join-Path $backupRoot "jq-download.tmp"
  Invoke-WebRequest -UseBasicParsing -Uri ([string]$runtime.url) -OutFile $download
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $download).Hash.ToLowerInvariant()
  if ($actual -ne [string]$runtime.sha256) { throw "jq checksum mismatch: $actual" }
  Move-Item -LiteralPath $download -Destination $destination
  $env:PATH = "$binRoot;$env:PATH"
  $version = (& $destination --version | Out-String).Trim()
  if ($version -ne "jq-$($runtime.version)") { throw "jq version mismatch: $version" }
}

function Install-Python3Shim {
  $python = Join-Path $globalRoot "python\Scripts\python.exe"
  if (-not (Test-Path -LiteralPath $python -PathType Leaf)) { throw "Global Python is missing: $python" }
  $shim = Join-Path $globalRoot "python\Scripts\python3.exe"
  if (-not (Test-Path -LiteralPath $shim -PathType Leaf)) {
    New-Item -ItemType HardLink -Path $shim -Target $python | Out-Null
  }

  foreach ($obsolete in @("python3.cmd", "python3.exe")) {
    $oldPath = Join-Path $globalRoot "bin\$obsolete"
    if (Test-Path -LiteralPath $oldPath) {
      Move-Item -LiteralPath $oldPath -Destination (Join-Path $backupRoot "obsolete-$obsolete")
    }
  }
}

function Install-ShasumShim {
  $shim = Join-Path $globalRoot "bin\shasum"
  $content = @'
#!/bin/sh
if [ "${1-}" = "-a" ] && [ "${2-}" = "256" ]; then
  shift 2
  exec sha256sum "$@"
fi
printf '%s\n' 'ERROR: only shasum -a 256 is supported by this compatibility shim.' >&2
exit 2
'@
  Write-Utf8Atomic $shim ($content.TrimEnd() + [Environment]::NewLine)
  & (Get-GitSh) -c "chmod +x '$($shim -replace '\\','/')'"
  if ($LASTEXITCODE -ne 0) { throw "Could not mark the shasum compatibility shim executable." }
}

function Install-Source {
  $commit = [string]$source.commit
  if (Test-Path -LiteralPath $vendor) {
    $actual = (& git -C $vendor rev-parse HEAD 2>$null).Trim()
    if ($actual -ne $commit) {
      New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
      Move-Item -LiteralPath $vendor -Destination (Join-Path $backupRoot "vendor-before-replace")
    }
  }
  if (-not (Test-Path -LiteralPath $vendor)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $vendor) | Out-Null
    & git clone --filter=blob:none --no-checkout $pins.repository_urls.'DannyMac180/sol-advisor' $vendor
    if ($LASTEXITCODE -ne 0) { throw "Sol Advisor clone failed." }
    & git -C $vendor checkout --detach $commit
    if ($LASTEXITCODE -ne 0) { throw "Sol Advisor checkout failed." }
  }

  $actual = (& git -C $vendor rev-parse HEAD).Trim()
  if ($actual -ne $commit) { throw "Sol Advisor commit mismatch: $actual" }
  $manifest = Get-Content -Raw -LiteralPath (Join-Path $pluginRoot ".codex-plugin\plugin.json") | ConvertFrom-Json
  if ([string]$manifest.version -ne [string]$source.version) {
    throw "Sol Advisor manifest version mismatch: $($manifest.version)"
  }

  if (-not $SkipTests) {
    $env:MSYS = "winsymlinks:nativestrict"
    & (Get-GitSh) (Join-Path $pluginRoot "scripts\verify.sh")
    if ($LASTEXITCODE -ne 0) { throw "Sol Advisor upstream verification failed." }
  }
}

function Install-NativeAgents {
  $installer = Join-Path $pluginRoot "scripts\install-agents.sh"
  $sh = Get-GitSh
  & $sh $installer
  if ($LASTEXITCODE -ne 0) { throw "Sol Advisor native agent installation failed." }
  & $sh $installer --check
  if ($LASTEXITCODE -ne 0) { throw "Sol Advisor native agent exactness check failed." }
}

function Get-CodexPlugins {
  $raw = (& codex plugin list --json 2>&1 | Out-String)
  $start = $raw.IndexOf("{")
  $end = $raw.LastIndexOf("}")
  if ($start -lt 0 -or $end -lt $start) { throw "Codex did not return plugin JSON." }
  return $raw.Substring($start, $end - $start + 1) | ConvertFrom-Json
}

function Register-Plugin {
  $expected = [System.IO.Path]::GetFullPath($pluginRoot)
  $installed = @((Get-CodexPlugins).installed | Where-Object { $_.pluginId -eq "sol-advisor@sol-advisor" }) | Select-Object -First 1
  if ($installed) {
    $actual = [System.IO.Path]::GetFullPath([string]$installed.source.path)
    if ($installed.enabled -and [string]$installed.version -eq [string]$source.version -and [string]::Equals($actual, $expected, [System.StringComparison]::OrdinalIgnoreCase)) { return }
    & codex plugin remove "sol-advisor@sol-advisor" --json | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not remove the old Sol Advisor plugin." }
  }
  $marketplaces = (& codex plugin marketplace list 2>&1 | Out-String)
  if ($marketplaces -match "(?m)^sol-advisor\s+") {
    & codex plugin marketplace remove sol-advisor --json | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not remove the old Sol Advisor marketplace." }
  }
  & codex plugin marketplace add $vendor --json | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not add the global Sol Advisor marketplace." }
  & codex plugin add "sol-advisor@sol-advisor" --json | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not add the global Sol Advisor plugin." }
}

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
Use-ProjectToolPath
Install-Jq
Install-Python3Shim
Install-ShasumShim
Install-Source
Install-NativeAgents
Register-Plugin

$state = [ordered]@{
  scope = "user"
  commit = [string]$source.commit
  version = [string]$source.version
  vendor = $vendor
  plugin = "sol-advisor@sol-advisor"
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
}
Write-Utf8Atomic (Join-Path $globalRoot "state\sol-advisor.json") (($state | ConvertTo-Json) + [Environment]::NewLine)
Write-Output "Sol Advisor user-global plugin and native routing ready: $pluginRoot"
