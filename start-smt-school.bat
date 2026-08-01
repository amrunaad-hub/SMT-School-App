@echo off
title SMT School App
color 0B
echo ============================================
echo   SMT School ERP System
echo   DB:     mongodb://localhost:27017
echo   Server: http://localhost:5001
echo   App:    http://localhost:3001
echo ============================================
echo.

set NPM="C:\Program Files\nodejs\npm.cmd"
set MONGOD="C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"

:: Start MongoDB (skip if already running)
echo [1/3] Starting MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I "mongod.exe" >NUL
if %ERRORLEVEL%==0 (
    echo        MongoDB already running - skipping.
) else (
    start "MongoDB (port 27017)" cmd /k "%MONGOD% --dbpath C:\data\db --logpath C:\data\log\mongod.log --logappend"
    timeout /t 4 /nobreak > nul
)

:: Free port 5001 if something is already using it
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5001 " ^| findstr "LISTENING"') do (
    echo        Freeing port 5001 ^(PID %%a^)...
    taskkill /F /PID %%a >NUL 2>&1
)
timeout /t 1 /nobreak > nul

:: Start Express server on port 5001
echo [2/3] Starting Express server on port 5001...
start "SMT School - Server (port 5001)" cmd /k "cd /d C:\Users\aplus\Projects\SMT-School-App && node server/app.js"

timeout /t 4 /nobreak > nul

:: Start React dev server on port 3001
echo [3/3] Starting React client on port 3001...
start "SMT School - Client (port 3001)" cmd /k "cd /d C:\Users\aplus\Projects\SMT-School-App\client && set PORT=3001 && %NPM% start"

timeout /t 10 /nobreak > nul

start http://localhost:3001

echo.
echo All services launched! Close this window anytime.
pause
