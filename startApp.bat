@echo off
title TK Clocking - Simple Starter
color 0B

:: 1. Force Cleanup (Kill any old processes on ports 3000 and 3001)
echo [1/4] Cleaning up old processes...
powershell -Command "Get-NetTCPConnection -LocalPort 3000, 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo Cleanup complete.
echo.

:: 2. Update IP
echo [2/4] Updating Mobile IP...
powershell -ExecutionPolicy Bypass -File "%~dp0update_flutter_ip.ps1"
echo IP update done.
echo.

:: 3. Check DB
echo [3/4] Checking PostgreSQL...
netstat -ano | findstr ":5432" >nul
if %errorlevel% == 0 (
    echo PostgreSQL is active.
) else (
    echo ERROR: PostgreSQL not detected! Please start your database.
    pause
    exit /b 1
)
echo.

:: 4. Start Services
echo [4/4] Starting Services...

:: Start Backend
start "TK-Backend" cmd /k "cd /d ""%~dp0backend"" && npm run start:dev"
echo Backend window opened.

timeout /t 5 /nobreak >nul

:: Start Dashboard
start "TK-Dashboard" cmd /k "cd /d ""%~dp0dashboard"" && npm run dev"
echo Dashboard window opened.

echo.
echo All services are launching!
echo Dashboard will be available at: http://localhost:3001
echo.
pause
