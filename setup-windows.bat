@echo off
REM 3A Trading System - Windows Setup Script

echo.
echo ========================================
echo 3A Trading System - Windows Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please download and install from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
npm --version
echo.

REM Get current directory
setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [INFO] Working directory: %cd%
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Please run this script in the 3a-trading-bot directory
    pause
    exit /b 1
)

REM Install dependencies
echo [STEP 1/5] Installing npm dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo [STEP 2/5] Creating .env file...
    (
        echo TELEGRAM_BOT_TOKEN=your_bot_token_here
        echo TELEGRAM_CHAT_ID=your_chat_id_here
    ) > .env
    echo [INFO] .env file created
    echo.
    echo [STEP 3/5] Edit .env file with your credentials:
    echo   1. Open .env file in notepad
    echo   2. Replace your_bot_token_here with your actual Telegram bot token
    echo   3. Replace your_chat_id_here with your actual chat ID
    echo   4. Save file
    echo.
    notepad .env
) else (
    echo [OK] .env file already exists
    echo.
)

REM Show menu
:menu
echo.
echo ========================================
echo Available commands:
echo ========================================
echo.
echo [1] Start server (npm start)
echo [2] Start server + client (npm run start:all)
echo [3] Start server with auto-restart (npm run dev)
echo [4] Install as Windows Service (NSSM)
echo [5] View .env file
echo [6] Edit .env file
echo [7] Exit
echo.

set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto start_all
if "%choice%"=="3" goto start_dev
if "%choice%"=="4" goto install_service
if "%choice%"=="5" goto view_env
if "%choice%"=="6" goto edit_env
if "%choice%"=="7" goto end
goto menu

:start_server
echo.
echo [INFO] Starting server only...
echo [INFO] Open browser: http://localhost:3000
echo [INFO] Press Ctrl+C to stop
echo.
call npm start
pause
goto menu

:start_all
echo.
echo [INFO] Starting server + client...
echo [INFO] Browser should open automatically
echo [INFO] Press Ctrl+C to stop
echo.
call npm run start:all
pause
goto menu

:start_dev
echo.
echo [INFO] Starting server with auto-restart (npm run dev)...
echo [INFO] This requires nodemon to be installed globally
echo [INFO] Press Ctrl+C to stop
echo.
call npm run dev
pause
goto menu

:install_service
echo.
echo [STEP 4/5] Installing Windows Service...
echo.
echo This will create a Windows Service named '3ATrading'
echo that starts automatically on system boot.
echo.
echo To proceed, you need to install NSSM:
echo 1. Download from: https://nssm.cc/download
echo 2. Extract and run setup script
echo OR
echo 3. Click OK to open NSSM website in browser
echo.
pause

start https://nssm.cc/

echo.
echo After installing NSSM:
echo.
echo 1. Open Command Prompt as Administrator
echo 2. Run these commands:
echo.
echo    nssm install 3ATrading "C:\Program Files\nodejs\node.exe" "%cd%\server.js"
echo    nssm set 3ATrading AppDirectory "%cd%"
echo    nssm set 3ATrading Start SERVICE_AUTO_START
echo    nssm start 3ATrading
echo.
echo 3. Verify: nssm status 3ATrading
echo.
pause
goto menu

:view_env
echo.
echo [INFO] Current .env file:
echo.
type .env
echo.
pause
goto menu

:edit_env
echo.
echo [INFO] Opening .env file for editing...
notepad .env
echo.
pause
goto menu

:end
echo.
echo [INFO] Setup completed!
echo.
echo Next steps:
echo 1. Edit .env with your Telegram credentials
echo 2. Run 'npm start' to test
echo 3. Set up Windows Service for 24/7 operation
echo 4. Open http://localhost:3000 in browser
echo.
echo Documentation: https://github.com/your-username/3a-trading-bot
echo.
pause
exit /b 0
