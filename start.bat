@echo off
title BioNexus Studio Launcher
echo ==========================================================
echo            BioNexus Studio - Startup Launcher
echo       Computational Bioinformatics Platform
echo ==========================================================
echo.

cd /d "%~dp0"

echo [*] Starting Express Backend Server (Port 5000)...
start /b node server/server.js

timeout /t 2 /nobreak >nul

echo [*] Launching Vite Frontend Dev Server (Port 5173)...
start http://localhost:5173

echo.
echo ==========================================================
echo   BioNexus Studio is now running!
echo   Live Site: https://bionexusstudio.ai
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000
echo ==========================================================
echo.

npm run dev
