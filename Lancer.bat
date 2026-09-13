@echo off
title Dashboard Revenus Podologue
color 0A

echo ========================================
echo   Dashboard Revenus Podologue
echo ========================================
echo.

:: Verifie si Node.js est installe
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js n'est pas installe. Installation automatique...
    echo.
    
    :: Telecharge le installer Node.js LTS
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.19.4/node-v20.19.4-x64.msi' -OutFile '%TEMP%\nodejs.msi'"
    
    echo Installation de Node.js en cours (cela peut prendre 1-2 minutes)...
    msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart
    
    :: Recharge le PATH
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERREUR: Installation de Node.js echouee.
        echo Installez Node.js manuellement sur https://nodejs.org puis relancez ce script.
        pause
        exit /b 1
    )
    echo Node.js installe avec succes !
    echo.
)

:: Verifie si npm est disponible
where npm >nul 2>&1
if %errorlevel% neq 0 (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

echo Node.js detecte : 
node --version
echo.

:: Va dans le dossier du script
cd /d "%~dp0"

:: Installe les dependances si node_modules absent
if not exist "node_modules" (
    echo Installation des dependances (premiere fois, ~2 minutes)...
    echo.
    npm install
    echo.
)

:: Lance l'application
echo Demarrage du dashboard...
echo Le navigateur va s'ouvrir automatiquement sur http://localhost:3000
echo.
echo Pour arreter : fermer cette fenetre
echo ========================================
echo.

:: Ouvre le navigateur apres 4 secondes
start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Lance Next.js
npm run dev
