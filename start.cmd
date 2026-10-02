@echo off
setlocal enableextensions
chcp 65001 >nul

REM ============================================================
REM  Vermoegenslabor - Starter (Doppelklick)
REM  Sucht Node.js (echtes Node oder portable Version),
REM  installiert bei Bedarf die Abhaengigkeiten und startet
REM  den Vite-Dev-Server inklusive Browser.
REM ============================================================

cd /d "%~dp0"

set "NODE_FOUND="

REM 1) Echte Node-Installation im PATH?
where node >nul 2>nul
if %errorlevel%==0 (
    set "NODE_FOUND=1"
    goto :node_ok
)

REM 2) Portable Node in %LOCALAPPDATA%\nodejs-portable\node-v*-win-x64 ?
for /d %%D in ("%LOCALAPPDATA%\nodejs-portable\node-v*-win-x64") do (
    if exist "%%~fD\node.exe" (
        set "PATH=%%~fD;%PATH%"
        set "NODE_FOUND=1"
        set "NODE_USED=%%~fD"
    )
)

if not defined NODE_FOUND (
    echo.
    echo [FEHLER] Node.js wurde nicht gefunden.
    echo.
    echo Bitte Node.js LTS installieren: https://nodejs.org/
    echo Alternativ wird eine portable Version unter
    echo   %LOCALAPPDATA%\nodejs-portable\node-v*-win-x64
    echo automatisch erkannt.
    echo.
    pause
    exit /b 1
)

:node_ok
if defined NODE_USED echo Verwende portable Node.js aus: %NODE_USED%
echo Node-Version:
node --version
echo.

if not exist "node_modules" (
    echo Abhaengigkeiten werden installiert ^(npm install^) ...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [FEHLER] npm install ist fehlgeschlagen.
        pause
        exit /b 1
    )
)

echo Starte Entwicklungsserver und oeffne den Browser ...
echo Zum Beenden dieses Fenster schliessen oder Strg+C druecken.
echo.
call npm run dev -- --open

echo.
echo Server beendet.
pause
