$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pidFile = Join-Path $repoRoot ".dev-state\dev-processes.json"

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

function Stop-ProcessTreeByPid {
  param(
    [int]$TargetPid
  )

  if ($TargetPid -le 0) {
    return
  }

  try {
    cmd /c "taskkill /PID $TargetPid /T /F" | Out-Null
    Write-Host "Stopped PID tree: $TargetPid"
  } catch {
    Write-Host "Failed to stop PID tree: $TargetPid"
  }
}

$state = $null
if (Test-Path $pidFile) {
  $state = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
}

$candidatePids = @()

if ($state) {
  $candidatePids += @($state.backend_pid, $state.frontend_pid) | Where-Object { $_ }
}

$frontendPort = if ($state -and $state.frontend_port) { [int]$state.frontend_port } else { 3000 }
$backendPort = if ($state -and $state.backend_port) { [int]$state.backend_port } else { 8001 }

$candidatePids += Get-ListeningPidsForPort -Port $frontendPort
$candidatePids += Get-ListeningPidsForPort -Port $backendPort
$candidatePids = $candidatePids | Sort-Object -Unique

if ($candidatePids.Count -eq 0) {
  Write-Host "No tracked dev processes or listening dev ports found."
} else {
  foreach ($procId in $candidatePids) {
    Stop-ProcessTreeByPid -TargetPid $procId
  }
}

if (Test-Path $pidFile) {
  Remove-Item -LiteralPath $pidFile -Force
}

Write-Host "Released frontend port target: $frontendPort"
Write-Host "Released backend port target: $backendPort"
Write-Host "Dev services stopped."
