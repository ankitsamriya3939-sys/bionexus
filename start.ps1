# =====================================================================
# BioNexus Studio - PowerShell Startup Launcher
# Launches both the Backend (Node.js Express / Python FastAPI) & Vite Frontend
# =====================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "             BioNexus Studio - Local Environment          " -ForegroundColor White
Write-Host "   Computational Bioinformatics Platform & Server Launcher " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$WorkspaceRoot = $PSScriptRoot
if (-not $WorkspaceRoot) { $WorkspaceRoot = Get-Location }

# 1. Check Node.js
try {
    $nodeVer = & node -v
    Write-Host "[OK] Node.js Detected: $nodeVer" -ForegroundColor Green
}
catch {
    Write-Host "[!] Node.js is not found on PATH. Please install Node.js." -ForegroundColor Red
    Exit 1
}

# 2. Check & Start Backend Server (Port 5000)
$isBackendAlreadyRunning = $false
try {
    $existingHealth = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($existingHealth.status -eq "online") {
        $isBackendAlreadyRunning = $true
        Write-Host "[OK] Backend Server is already active on: http://localhost:5000" -ForegroundColor Green
    }
}
catch {
    $isBackendAlreadyRunning = $false
}

if (-not $isBackendAlreadyRunning) {
    Write-Host "[*] Starting Express Backend Server on port 5000..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "server/server.js" -WorkingDirectory $WorkspaceRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2

    # Verify Backend Health
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 3
        if ($health.status -eq "online") {
            Write-Host "[OK] Backend Server Online at: http://localhost:5000" -ForegroundColor Green
            Write-Host "    Health Endpoint: http://localhost:5000/api/health" -ForegroundColor Gray
            Write-Host "    NCBI Status:     http://localhost:5000/api/ncbi/status" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "[i] Backend starting up in background..." -ForegroundColor Yellow
    }
}

# 3. Start Frontend (Vite)
Write-Host "[*] Launching Vite Frontend Dev Server..." -ForegroundColor Yellow

# Open default browser after short delay
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  BioNexus Studio is now running!" -ForegroundColor Green
Write-Host "  Frontend (Dev): http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API:    http://localhost:5000" -ForegroundColor White
Write-Host "  Full SPA/Prod:  http://localhost:5000 (after npm run build)" -ForegroundColor Yellow
Write-Host "  Press Ctrl+C in this console to stop the frontend." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Run Vite in the current console (cmd.exe /c bypasses PowerShell execution policy)
& cmd.exe /c npm run dev
