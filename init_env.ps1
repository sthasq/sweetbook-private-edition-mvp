param(
  [switch]$Force
)

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envExamplePath = Join-Path $rootDir ".env.example"
$envPath = Join-Path $rootDir ".env"

if (-not (Test-Path $envExamplePath)) {
  Write-Error ".env.example was not found at $envExamplePath"
  exit 1
}

if ((Test-Path $envPath) -and -not $Force) {
  Write-Host ".env already exists. Skipping copy to protect current values." -ForegroundColor Yellow
  Write-Host "Use .\\init_env.ps1 -Force only when you intentionally want to reset it." -ForegroundColor Yellow
  exit 0
}

if ((Test-Path $envPath) -and $Force) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupPath = Join-Path $rootDir ".env.bak-$timestamp"
  Copy-Item $envPath $backupPath -Force
  Write-Host "Backed up existing .env to $backupPath" -ForegroundColor Cyan
}

Copy-Item $envExamplePath $envPath -Force
Write-Host "Initialized .env from .env.example. Fill in the real secret values before running the app." -ForegroundColor Green
