@echo off
setlocal enabledelayedexpansion
title Build - Dashboard Revenus Podologue

echo =========================================
echo   Build EXE - Dashboard Revenus Podologue
echo =========================================
echo.

:: --- Verifications ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe. Telechargez-le sur https://nodejs.org
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] pnpm non trouve, installation en cours...
    npm install -g pnpm
)

:: --- Installation des dependances ---
echo [1/4] Installation des dependances...
call pnpm install
if %errorlevel% neq 0 ( echo [ERREUR] pnpm install a echoue. & pause & exit /b 1 )

:: --- Build Next.js standalone ---
echo [2/4] Build Next.js (mode standalone)...
call pnpm build
if %errorlevel% neq 0 ( echo [ERREUR] next build a echoue. & pause & exit /b 1 )

:: --- Copie des fichiers statiques dans standalone ---
echo [3/4] Copie des assets statiques...
xcopy /e /i /y ".next\static" ".next\standalone\.next\static" >nul
xcopy /e /i /y "public" ".next\standalone\public" >nul

:: --- Installation de pkg + creation de l'exe ---
echo [4/4] Creation de l'executable Windows...
call npx pkg launcher.js --targets node18-win-x64 --output dist\dashboard.exe --assets ".next\standalone\**"
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] pkg a echoue. Essai avec la methode alternative (dossier portable)...
    goto :portable
)

echo.
echo =========================================
echo   Succes ! Fichier : dist\dashboard.exe
echo =========================================
pause
exit /b 0

:: --- Fallback : dossier portable (sans pkg) ---
:portable
echo [ALT] Creation d'un dossier portable a la place...
if not exist "dist\app" mkdir "dist\app"
xcopy /e /i /y ".next\standalone" "dist\app" >nul
copy "launcher.js" "dist\app\launcher.js" >nul

echo @echo off > "dist\app\Demarrer.bat"
echo node launcher.js >> "dist\app\Demarrer.bat"

echo.
echo =========================================
echo   Succes (mode portable) !
echo   Dossier : dist\app\
echo   Lancez   : dist\app\Demarrer.bat
echo =========================================
pause
