$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$stateDir = Join-Path $repoRoot ".dev-state"
$pidFile = Join-Path $stateDir "dev-processes.json"
$frontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 3000 }
$backendPort = if ($env:BACKEND_PORT) { [int]$env:BACKEND_PORT } else { 8001 }
$condaEnvName = if ($env:CONDA_ENV_NAME) { $env:CONDA_ENV_NAME } else { "allinone" }

function Resolve-PythonExecutable {
  param(
    [string]$EnvName
  )

  $candidates = @()

  if ($env:DEV_PYTHON -and (Test-Path $env:DEV_PYTHON)) {
    $candidates += $env:DEV_PYTHON
  }

  $candidates += @(
    "D:\software\conda\envs\$EnvName\python.exe",
    "D:\devpy\conda\envs\$EnvName\python.exe",
    (Join-Path $env:USERPROFILE "miniconda3\envs\$EnvName\python.exe"),
    (Join-Path $env:USERPROFILE "anaconda3\envs\$EnvName\python.exe")
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
  }

  try {
    $condaPython = (conda run -n $EnvName where python | Select-Object -First 1).Trim()
    if ($condaPython) {
      return $condaPython
    }
  } catch {
  }

  return (where.exe python | Select-Object -First 1).Trim()
}

$pythonExe = Resolve-PythonExecutable -EnvName $condaEnvName
if ($pythonExe -notlike "*$condaEnvName*") {
  Write-Host "WARNING: conda env '$condaEnvName' was not resolved directly, using python: $pythonExe"
}

$npmCommand = "npm"
$backendLog = Join-Path $stateDir "backend-$backendPort.log"
$frontendLog = Join-Path $stateDir "frontend-$frontendPort.log"

function Stop-ProcessTreeByPid {
  param(
    [int]$TargetPid
  )

  if ($TargetPid -le 0) {
    return
  }

  try {
    cmd /c "taskkill /PID $TargetPid /T /F" | Out-Null
  } catch {
  }
}

function Test-PortListening {
  param(
    [int]$Port
  )

  $lines = cmd /c "netstat -ano | findstr LISTENING | findstr :$Port" 2>$null
  return -not [string]::IsNullOrWhiteSpace(($lines | Out-String))
}

function Get-ListeningPidsForPort {
  param(
    [int]$Port
  )

  $lines = cmd /c "netstat -ano | findstr LISTENING | findstr :$Port" 2>$null
  if (-not $lines) {
    return @()
  }

  $pids = @()
  foreach ($line in $lines) {
    $trimmed = ($line -replace "^\s+", "") -replace "\s+", " "
    $parts = $trimmed.Split(" ")
    if ($parts.Length -ge 5) {
      $pidValue = 0
      if ([int]::TryParse($parts[4], [ref]$pidValue)) {
        $pids += $pidValue
      }
    }
  }

  return $pids | Sort-Object -Unique
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

if (Test-Path $pidFile) {
  try {
    $existingState = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
    $trackedPids = @($existingState.backend_pid, $existingState.frontend_pid) | Where-Object { $_ }
    $alivePids = @()
    foreach ($trackedPid in $trackedPids) {
      if (Get-Process -Id $trackedPid -ErrorAction SilentlyContinue) {
        $alivePids += $trackedPid
      }
    }

    if ($alivePids.Count -gt 0) {
      throw "Found existing dev state with active processes ($($alivePids -join ', ')). Run scripts/dev-stop.ps1 first."
    }

    Remove-Item -LiteralPath $pidFile -Force
    Write-Host "Removed stale dev state file."
  } catch {
    throw
  }
}

if (Test-PortListening -Port $frontendPort) {
  $frontendPids = Get-ListeningPidsForPort -Port $frontendPort
  throw "Frontend port $frontendPort is already in use by PID(s): $($frontendPids -join ', '). Run scripts/dev-stop.ps1 or stop those processes first."
}

if (Test-PortListening -Port $backendPort) {
  $backendPids = Get-ListeningPidsForPort -Port $backendPort
  throw "Backend port $backendPort is already in use by PID(s): $($backendPids -join ', '). Run scripts/dev-stop.ps1 or stop those processes first."
}

$backend = Start-Process -FilePath "cmd.exe" `
  -ArgumentList @(
    "/c",
    "cd /d `"$repoRoot`" && set PORT=$backendPort && `"$pythonExe`" -m api.main > `"$backendLog`" 2>&1"
  ) `
  -WindowStyle Hidden `
  -PassThru

$frontend = Start-Process -FilePath "cmd.exe" `
  -ArgumentList @(
    "/c",
    "cd /d `"$repoRoot`" && set PORT=$frontendPort && $npmCommand run dev -- --port $frontendPort > `"$frontendLog`" 2>&1"
  ) `
  -WindowStyle Hidden `
  -PassThru

$backendReady = Wait-ForPort -Port $backendPort -TimeoutSeconds 30
if (-not $backendReady) {
  Stop-ProcessTreeByPid -TargetPid $backend.Id
  Stop-ProcessTreeByPid -TargetPid $frontend.Id
  throw "Backend failed to start on port $backendPort. Check log: $backendLog"
}

$frontendReady = Wait-ForPort -Port $frontendPort -TimeoutSeconds 45
if (-not $frontendReady) {
  Stop-ProcessTreeByPid -TargetPid $backend.Id
  Stop-ProcessTreeByPid -TargetPid $frontend.Id
  throw "Frontend failed to start on port $frontendPort. Check log: $frontendLog"
}

$state = @{
  backend_pid = $backend.Id
  frontend_pid = $frontend.Id
  backend_port = $backendPort
  frontend_port = $frontendPort
  python_executable = $pythonExe
  npm_command = $npmCommand
  backend_log = $backendLog
  frontend_log = $frontendLog
  started_at = (Get-Date).ToString("s")
} | ConvertTo-Json

Set-Content -LiteralPath $pidFile -Value $state -Encoding UTF8

Write-Host "Started backend PID: $($backend.Id)"
Write-Host "Started frontend PID: $($frontend.Id)"
Write-Host "Backend: http://localhost:$backendPort/health"
Write-Host "Open: http://localhost:$frontendPort/pre-assessment"
Write-Host "Python: $pythonExe"
Write-Host "NPM: $npmCommand"
Write-Host "Backend log: $backendLog"
Write-Host "Frontend log: $frontendLog"
