@echo off
chcp 65001 >nul
title TK Clocking — Start Services
color 0B

echo ╔══════════════════════════════════════════════════════════════╗
echo ║           TK Clocking System — Launch Services               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Update Flutter IP
echo [1/4] Updating Mobile App IP Address...
powershell -ExecutionPolicy Bypass -File "%~dp0update_flutter_ip.ps1"
echo.

:: Check PostgreSQL
echo [2/4] Checking PostgreSQL...
netstat -ano | findstr ":5432" >nul
if %errorlevel% == 0 (
    echo     ✓ PostgreSQL is running on port 5432
) else (
    echo     ⚠ PostgreSQL not detected on port 5432
    echo       Please start PostgreSQL before continuing.
    pause
    exit /b 1
)

:: Start Backend
echo.
echo [3/4] Starting Backend API (NestJS)...
start "TK Clocking Backend" cmd /k "cd /d ""%~dp0backend"" && echo Installing dependencies if needed... && npm install && echo. && echo Starting Backend... && npm run start:dev && pause"

echo     ✓ Backend window opened — compiling...
timeout /t 8 /nobreak >nul

:: Start Dashboard
echo.
echo [4/4] Starting Admin Dashboard (Next.js)...
start "TK Clocking Dashboard" cmd /k "cd /d ""%~dp0dashboard"" && echo Installing dependencies if needed... && npm install && echo. && echo Starting Dashboard... && npm run dev && pause"

echo     ✓ Dashboard window opened — compiling...
timeout /t 4 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  All services launching...                                   ║
echo ║                                                              ║
echo ║  📡 Backend API:    http://localhost:3000/api/v1             ║
echo ║  📖 Swagger Docs:   http://localhost:3000/api/docs           ║
echo ║  🖥️  Dashboard:      http://localhost:3001                   ║
echo ║                                                              ║
echo ║  Press any key to close this window...                       ║
echo ╚══════════════════════════════════════════════════════════════╝
pause >nul
