@echo off
setlocal
title NEON Load Balancer Launcher
cd /d "%~dp0"

echo ================================================
echo    NEON . AI LOAD BALANCER  -  starting up
echo ================================================
echo.

REM --- Check Node is installed ---------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on your PATH.
  echo         Install it from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

REM --- Install dependencies on first run -----------------------------------
if not exist "backend\node_modules" (
  echo [setup] Installing backend dependencies...
  pushd backend && call npm install --no-audit --no-fund && popd
)
if not exist "backend-services\node_modules" (
  echo [setup] Installing backend-services dependencies...
  pushd backend-services && call npm install --no-audit --no-fund && popd
)
if not exist "frontend\node_modules" (
  echo [setup] Installing frontend dependencies...
  pushd frontend && call npm install --no-audit --no-fund && popd
)

echo.
echo [1/2] Launching load balancer  ^-^>  http://localhost:3030
start "NEON Load Balancer" /d "%~dp0backend" cmd /k "npm run dev"

echo [2/2] Launching dashboard      ^-^>  http://localhost:5173
start "NEON Dashboard" /d "%~dp0frontend" cmd /k "npm run dev"

REM --- Give the dev servers a moment, then open the browser ----------------
echo.
echo Waiting for servers to warm up...
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ================================================
echo   Dashboard : http://localhost:5173
echo   Balancer  : http://localhost:3030
echo.
echo   Two server windows opened. Close them (or press
echo   Ctrl+C in each) to stop the load balancer.
echo ================================================
echo.
echo This launcher window can be closed.
timeout /t 4 /nobreak >nul
endlocal
