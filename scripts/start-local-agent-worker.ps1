$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$agentDir = Join-Path $repoRoot "agent-worker"
$envFile = Join-Path $repoRoot ".env.local"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $parts = $line.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

if (-not [Environment]::GetEnvironmentVariable("AGENT_WORKER_TOKEN", "Process")) {
    [Environment]::SetEnvironmentVariable("AGENT_WORKER_TOKEN", "local-agent-token", "Process")
}

Set-Location $agentDir

Write-Host "Starting US Economy Agent Worker on http://localhost:8090"
Write-Host "Install dependencies first if needed: python -m pip install -r requirements.txt"

python -m uvicorn app.main:app --host 127.0.0.1 --port 8090
