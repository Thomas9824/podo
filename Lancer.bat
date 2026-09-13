@echo off
title Dashboard Revenus Podologue
color 0A

echo ========================================
echo   Dashboard Revenus Podologue
echo ========================================
echo.

:: Va dans le dossier du script (important)
cd /d "%~dp0"

:: ---- Verifie Node.js ----
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js non detecte. Telechargement en cours...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.19.4/node-v20.19.4-x64.msi' -OutFile '%TEMP%\nodejs.msi'"
    echo Installation de Node.js (1-2 minutes)...
    msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart
    :: Recharge PATH
    for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do set "PATH=%%i;%PATH%"
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    echo Node.js installe.
    echo.
)

:: ---- Verifie pnpm ----
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo Installation de pnpm...
    call npm install -g pnpm
    echo.
)

:: ---- Installe les dependances si besoin ----
if not exist "node_modules" (
    echo Installation des dependances (premiere fois ~3 minutes)...
    echo.
    call pnpm install
    echo.
)

:: ---- Lance l'app ----
echo Demarrage du dashboard sur http://localhost:3000
echo Cette fenetre doit rester ouverte.
echo Pour arreter : fermer cette fenetre.
echo ========================================
echo.

:: Ouvre le navigateur apres 8 secondes
start "" /b cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:3000"

:: Lance Next.js
call pnpm dev
pause
