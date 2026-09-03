@echo off
setlocal EnableDelayedExpansion

rem ============================================================
rem  WanJie DaoYou - one-click launcher
rem  Starts the game (bun run dev) if not running, then opens
rem  the browser at the game URL.
rem ============================================================

set "PROJECT=%USERPROFILE%\WorkBuddy\2026-08-31-20-57-50\daoyou"
set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
set "URL=http://localhost:5173"
set "PORT=5173"

if not exist "%BUN%" (
    echo [ERROR] bun not found at %BUN%
    echo Please install bun first: https://bun.sh
    pause
    exit /b 1
)

cd /d "%PROJECT%" || (
    echo [ERROR] project dir not found: %PROJECT%
    pause
    exit /b 1
)

rem ---- check if game already running on PORT ----
set "RUNNING=0"
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>&1 && set "RUNNING=1"

if "!RUNNING!"=="1" (
    echo [INFO] Game already running. Opening browser...
    start "" "%URL%"
    exit /b 0
)

echo [INFO] Starting game (bun run dev)...
start "WanJieDaoYou Server" cmd /k ""%BUN%" run dev"

rem ---- wait for port to open (max ~90s) ----
echo [INFO] Waiting for server to be ready...
set /a TRIES=0
:waitloop
    set /a TRIES+=1
    if !TRIES! GEQ 90 (
        echo [WARN] Server did not come up in 90s. Opening browser anyway...
        start "" "%URL%"
        exit /b 0
    )
    timeout /t 1 /nobreak >nul
    netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>&1 && goto ready
    goto waitloop

:ready
echo [INFO] Server ready. Opening browser...
start "" "%URL%"
exit /b 0
