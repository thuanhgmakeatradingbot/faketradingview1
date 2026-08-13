@echo off
REM Push 3A Trading System to GitHub
REM Run: push-github.bat

chcp 65001 >nul
color 0B
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   3A Trading System - Push to GitHub                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git not installed!
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [OK] Git found:
git --version
echo.

REM Get current directory
cd /d "%~dp0"
echo [INFO] Current directory: %cd%
echo.

REM Config git
echo [STEP 1/6] Configuring Git...
git config --global user.name "Thuan Trading Bot"
git config --global user.email "thuanhgmakeatradingbot@gmail.com"
echo [OK] Git configured
echo.

REM Check if .git exists
if exist .git (
    echo [STEP 2/6] Git repository already initialized
) else (
    echo [STEP 2/6] Initializing git repository...
    git init
    git add .
    git commit -m "Initial commit - 3A Trading System with Windows VPS deployment guides"
    echo [OK] Repository initialized and committed
)
echo.

REM Remove old remote and add new one
echo [STEP 3/6] Configuring GitHub remote...
git remote remove origin 2>nul
git remote add origin https://github.com/thuanhgmakeatradingbot/faketradingview.git
echo [OK] Remote added
echo.

REM Show remote
echo [STEP 4/6] Verifying remote:
git remote -v
echo.

REM Rename branch to main
echo [STEP 5/6] Renaming branch to main...
git branch -M main 2>nul
echo [OK] Branch renamed
echo.

REM Push to GitHub
echo [STEP 6/6] Pushing code to GitHub...
echo.
echo [INFO] This will ask for GitHub credentials
echo [INFO] Use your GitHub username and Personal Access Token
echo.
echo Creating GitHub Personal Access Token:
echo 1. Go to: https://github.com/settings/tokens
echo 2. Click "Generate new token"
echo 3. Select "repo" scope
echo 4. Copy token and paste when prompted for password
echo.

git push -u origin main

REM Check result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔════════════════════════════════════════════════════════════╗
    echo ║   ✅ SUCCESS! Code pushed to GitHub                        ║
    echo ╚════════════════════════════════════════════════════════════╝
    echo.
    echo Repository: https://github.com/thuanhgmakeatradingbot/faketradingview
    echo Branch: main
    echo.
    echo Ready to deploy on Windows VPS!
) else (
    echo.
    echo ╔════════════════════════════════════════════════════════════╗
    echo ║   ❌ Push failed                                           ║
    echo ╚════════════════════════════════════════════════════════════╝
    echo.
    echo Troubleshooting:
    echo 1. Check repo exists: https://github.com/thuanhgmakeatradingbot/faketradingview
    echo 2. Check git: git --version
    echo 3. Check remote: git remote -v
    echo 4. Try manually: git push -u origin main
)

echo.
pause
