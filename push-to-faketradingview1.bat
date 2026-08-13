@echo off
REM Push 3A Trading System to faketradingview1 repository
REM Run this in the project directory

chcp 65001 >nul
color 0B
cls

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   Push to: faketradingview1                              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git not found!
    echo Download: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [OK] Git:
git --version
echo.

cd /d "%~dp0"
echo [INFO] Directory: %cd%
echo.

REM Config
echo [STEP 1/5] Configuring Git...
git config --global user.name "Thuan Trading Bot"
git config --global user.email "thuanhgmakeatradingbot@gmail.com"
echo [OK] Configured
echo.

REM Remote
echo [STEP 2/5] Setting up remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/thuanhgmakeatradingbot/faketradingview1.git
echo [OK] Remote added:
git remote -v
echo.

REM Branch
echo [STEP 3/5] Renaming branch to main...
git branch -M main
echo [OK] Branch renamed
git branch -a
echo.

REM Push
echo [STEP 4/5] Adding files...
git add .
echo [OK] Files added
echo.

echo [STEP 5/5] Pushing to GitHub...
echo.
echo [INFO] Pushing to: https://github.com/thuanhgmakeatradingbot/faketradingview1.git
echo [INFO] Enter credentials when prompted
echo.

git push -u origin main

REM Result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║   ✅ SUCCESS! Code pushed                                ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo Repository: https://github.com/thuanhgmakeatradingbot/faketradingview1
    echo Branch: main
    echo.
    echo Ready to deploy on Windows VPS!
) else (
    echo.
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║   ❌ Push failed                                         ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo Check:
    echo 1. GitHub repo exists and is PUBLIC
    echo 2. Personal Access Token is correct
    echo 3. Token has "repo" scope
    echo 4. Git is installed: git --version
)

echo.
pause
