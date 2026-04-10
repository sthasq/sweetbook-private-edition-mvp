param(
  [ValidateSet("h2", "mysql")]
  [string]$Database = "mysql"
)

function Test-DockerEngine {
  $null = & docker version --format '{{.Server.Version}}' 2>$null
  return $LASTEXITCODE -eq 0
}

function Get-ComposeMysqlContainerId {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot
  )

  Push-Location $ProjectRoot
  try {
    $containerId = (& docker compose ps -q mysql 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0) {
      return $null
    }
    return $containerId
  } finally {
    Pop-Location
  }
}

function Get-ContainerEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ContainerId,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $value = & docker inspect $ContainerId --format "{{range .Config.Env}}{{println .}}{{end}}" 2>$null |
    Where-Object { $_ -like "$Name=*" } |
    Select-Object -First 1
  if (-not $value) {
    return $null
  }
  return $value.Substring($Name.Length + 1)
}

function Get-PortOwnerProcessName {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
      Select-Object -First 1
    if (-not $connection) {
      return $null
    }

    $process = Get-Process -Id $connection.OwningProcess -ErrorAction Stop
    return $process.ProcessName
  } catch {
    return $null
  }
}

function Test-DockerOwnedPort {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProcessName
  )

  $dockerProcessNames = @(
    "com.docker.backend",
    "Docker Desktop",
    "docker",
    "dockerd",
    "wslrelay"
  )

  return $dockerProcessNames -contains $ProcessName
}

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
    Set-Item -Path "Env:$name" -Value $value
  }
}

function Test-BlankEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name))
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$rootEnvPath = Join-Path $rootDir ".env"
$rootEnvExamplePath = Join-Path $rootDir ".env.example"
Import-DotEnv -Path $rootEnvPath

if ((Test-Path $rootEnvPath) -and (Test-Path $rootEnvExamplePath)) {
  $getFileHash = Get-Command Get-FileHash -ErrorAction SilentlyContinue
  if ($getFileHash) {
    $envHash = (Get-FileHash -Path $rootEnvPath -Algorithm SHA256).Hash
    $exampleHash = (Get-FileHash -Path $rootEnvExamplePath -Algorithm SHA256).Hash
    if ($envHash -eq $exampleHash) {
      Write-Host ".env currently matches .env.example. If you expected real secrets, refill .env before running." -ForegroundColor Yellow
    }
  }
}

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

if (Test-BlankEnv "SWEETBOOK_API_KEY") {
  Write-Host "SWEETBOOK_API_KEY is empty or missing. Backend will run in demo/simulated mode." -ForegroundColor Yellow
}

if ((Test-BlankEnv "GOOGLE_CLIENT_ID") -or (Test-BlankEnv "GOOGLE_CLIENT_SECRET")) {
  Write-Host "Google OAuth envs are empty or missing. YouTube login may stay disabled." -ForegroundColor Yellow
}

if ($Database -eq "mysql") {
  $mysqlHost = if ($env:MYSQL_HOST) { $env:MYSQL_HOST } else { "localhost" }
  $mysqlPort = if ($env:MYSQL_PORT) { $env:MYSQL_PORT } else { "3307" }
  $mysqlDatabase = if ($env:MYSQL_DATABASE) { $env:MYSQL_DATABASE } else { "playpick" }
  $redisHost = if ($env:REDIS_HOST) { $env:REDIS_HOST } else { "localhost" }
  $redisPort = if ($env:REDIS_PORT) { $env:REDIS_PORT } else { "6380" }

  $portOwner = Get-PortOwnerProcessName -Port ([int]$mysqlPort)
  if ($portOwner -and -not (Test-DockerOwnedPort -ProcessName $portOwner)) {
    Write-Host "Port $mysqlPort is already in use by '$portOwner'." -ForegroundColor Red
    Write-Host "Docker MySQL needs ${mysqlHost}:$mysqlPort. Stop that service first, then run .\\run_local.ps1 again." -ForegroundColor Yellow
    exit 1
  }

  if (-not (Test-DockerEngine)) {
    Write-Host "Docker Desktop is not running. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
  }

  Push-Location $rootDir
  try {
    & docker compose up -d mysql redis
    if ($LASTEXITCODE -ne 0) {
      throw "docker compose up -d mysql redis failed."
    }
  } finally {
    Pop-Location
  }

  $mysqlContainerId = Get-ComposeMysqlContainerId -ProjectRoot $rootDir
  if ($mysqlContainerId) {
    $containerRootPassword = Get-ContainerEnvValue -ContainerId $mysqlContainerId -Name "MYSQL_ROOT_PASSWORD"
    if ($containerRootPassword -and $env:MYSQL_ROOT_PASSWORD -and $containerRootPassword -ne $env:MYSQL_ROOT_PASSWORD) {
      Write-Host "Docker MySQL container credentials do not match this project's .env." -ForegroundColor Red
      Write-Host "This usually means the container or volume was created with older credentials." -ForegroundColor Yellow
      Write-Host "Run 'docker compose down -v' in the project root, then run .\\run_local.ps1 again to recreate MySQL on ${mysqlHost}:$mysqlPort." -ForegroundColor Yellow
      exit 1
    }
  }

  if (-not $env:SPRING_DATASOURCE_URL) {
    $env:SPRING_DATASOURCE_URL = "jdbc:mysql://${mysqlHost}:${mysqlPort}/${mysqlDatabase}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul"
  } else {
    $env:SPRING_DATASOURCE_URL = "jdbc:mysql://${mysqlHost}:${mysqlPort}/${mysqlDatabase}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul"
  }

  if ($env:MYSQL_USERNAME) {
    $env:SPRING_DATASOURCE_USERNAME = $env:MYSQL_USERNAME
  } else {
    $env:SPRING_DATASOURCE_USERNAME = "playpick"
  }

  if ($env:MYSQL_PASSWORD) {
    $env:SPRING_DATASOURCE_PASSWORD = $env:MYSQL_PASSWORD
  } elseif ($env:MYSQL_ROOT_PASSWORD) {
    $env:SPRING_DATASOURCE_PASSWORD = $env:MYSQL_ROOT_PASSWORD
  } else {
    $env:SPRING_DATASOURCE_PASSWORD = "playpick"
  }

  $env:SPRING_DATA_REDIS_HOST = $redisHost
  $env:SPRING_DATA_REDIS_PORT = $redisPort

  Write-Host "Running backend with MySQL datasource: $($env:SPRING_DATASOURCE_URL)" -ForegroundColor Cyan
  Write-Host "Using Redis-backed HTTP sessions: $($env:SPRING_DATA_REDIS_HOST):$($env:SPRING_DATA_REDIS_PORT)" -ForegroundColor Cyan
  Write-Host "Use -Database h2 if you need the temporary in-memory profile." -ForegroundColor DarkGray
  $serverPortOwner = Get-PortOwnerProcessName -Port 8080
  if ($serverPortOwner) {
    Write-Host "Port 8080 is already in use by '$serverPortOwner'." -ForegroundColor Red
    Write-Host "Stop that process or change SERVER_PORT before running the backend." -ForegroundColor Yellow
    exit 1
  }
  .\gradlew.bat bootRun --args="--spring.profiles.active=local,mysql-local,session-redis --server.port=8080"
  exit $LASTEXITCODE
}

Write-Host "Running backend with H2 in-memory datasource." -ForegroundColor Cyan
.\gradlew.bat bootRun --args="--spring.profiles.active=local --server.port=8080"
