$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$logDir = Join-Path $repoRoot ".local-logs"
$logFile = Join-Path $logDir "backend.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Location $backendDir

& "C:\apache-maven-3.9.5\bin\mvn.cmd" spring-boot:run *>&1 | Tee-Object -FilePath $logFile
