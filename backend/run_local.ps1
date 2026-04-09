function Import-DotEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }
    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) {
      return
    }

    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()
    if (-not [Environment]::GetEnvironmentVariable($name)) {
      [Environment]::SetEnvironmentVariable($name, $value)
    }
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootEnvPath = Join-Path (Split-Path -Parent $scriptDir) ".env"
Import-DotEnv -Path $rootEnvPath

if (-not $env:SWEETBOOK_BASE_URL) {
  $env:SWEETBOOK_BASE_URL = "https://api-sandbox.sweetbook.com/v1"
}

if (-not $env:GOOGLE_REDIRECT_URI) {
  $env:GOOGLE_REDIRECT_URI = "http://localhost:3000/oauth/google/callback"
}

if (-not $env:SWEETBOOK_ENABLED) {
  if ($env:SWEETBOOK_API_KEY) {
    $env:SWEETBOOK_ENABLED = "true"
  } else {
    $env:SWEETBOOK_ENABLED = "false"
  }
}

if (-not $env:SWEETBOOK_API_KEY) {
  Write-Host "SWEETBOOK_API_KEY is not set. Backend will run in demo/simulated mode." -ForegroundColor Yellow
}

if (-not $env:GOOGLE_CLIENT_ID -or -not $env:GOOGLE_CLIENT_SECRET) {
  Write-Host "Google OAuth envs are not fully set. YouTube login may stay disabled." -ForegroundColor Yellow
}

.\gradlew.bat bootRun --args="--spring.profiles.active=local --server.port=8080"
