# 3A Trading System - Windows Setup PowerShell Script
# Run: powershell -ExecutionPolicy Bypass -File setup-windows.ps1

# Set console color
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Cyan"
Clear-Host

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║   3A Trading System - Windows Setup                          ║
║   For Windows Server/VPS Deployment                          ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Function to write info
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

# Function to write error
function Write-Err {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to write section
function Write-Section {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Yellow
}

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Err "This script must be run as Administrator!"
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Running as Administrator: OK"

# Check Node.js installation
Write-Section "Checking Prerequisites"

$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Info "Node.js found: $nodeVersion"
} else {
    Write-Err "Node.js not installed!"
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

$npmVersion = npm --version 2>$null
Write-Info "npm version: $npmVersion"

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Info "Working directory: $pwd"

if (-NOT (Test-Path "package.json")) {
    Write-Err "package.json not found!"
    Write-Host "Please run this script in the 3a-trading-bot directory"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "package.json found: OK"

# Install dependencies
Write-Section "Step 1: Installing npm dependencies"
Write-Host "This may take 2-5 minutes..." -ForegroundColor Yellow

npm install

if ($LASTEXITCODE -ne 0) {
    Write-Err "npm install failed!"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Dependencies installed successfully!"

# Create .env file
Write-Section "Step 2: Setting up environment variables"

if (-NOT (Test-Path ".env")) {
    Write-Info "Creating .env file..."
    @"
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
"@ | Out-File -Encoding UTF8 ".env"
    Write-Info ".env file created"
} else {
    Write-Info ".env file already exists"
}

Write-Host "`nPlease edit .env with your credentials:" -ForegroundColor Magenta
Write-Host "1. Get Telegram Bot Token from @BotFather" -ForegroundColor Yellow
Write-Host "2. Get Chat ID from @userinfobot" -ForegroundColor Yellow
Write-Host "3. Update .env file with your values" -ForegroundColor Yellow

Write-Host "`nOpen .env now? (Y/N): " -NoNewline -ForegroundColor Cyan
$response = Read-Host
if ($response -eq "Y" -or $response -eq "y") {
    notepad .env
}

# Test installation
Write-Section "Step 3: Testing installation"

Write-Host "Testing Node.js and npm..." -ForegroundColor Yellow
$testOutput = npm list --depth=0 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Info "Dependencies check: OK"
    Write-Host $testOutput -ForegroundColor Gray
}

# Check firewall
Write-Section "Step 4: Firewall Configuration"

Write-Host "Current firewall status:" -ForegroundColor Yellow
$firewallStatus = Get-NetFirewallProfile | Select-Object Name, Enabled
$firewallStatus | Format-Table

Write-Host "`nAllow port 3000 for web dashboard? (Y/N): " -NoNewline -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    $ruleName = "Allow Port 3000 - 3ATrading"

    # Check if rule exists
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if ($existingRule) {
        Write-Info "Firewall rule already exists"
    } else {
        Write-Info "Creating firewall rule..."
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -ErrorAction Continue
        Write-Info "Firewall rule created: Allow inbound on port 3000"
    }
}

# Show menu
function Show-Menu {
    Write-Section "Available Commands"

    Write-Host @"
[1] Start server (npm start)
[2] Start server + client (npm run start:all)
[3] Start server with auto-restart (npm run dev)
[4] Test WebSocket connection to OKX
[5] View .env file
[6] Edit .env file
[7] Install as Windows Service (NSSM)
[8] Show system status
[9] Exit
"@ -ForegroundColor Cyan

    Write-Host "Select option (1-9): " -NoNewline -ForegroundColor Green
    $choice = Read-Host
    return $choice
}

# Main loop
$isRunning = $true

while ($isRunning) {
    $choice = Show-Menu

    switch ($choice) {
        "1" {
            Write-Section "Starting server"
            Write-Host "Open browser at: http://localhost:3000" -ForegroundColor Magenta
            Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
            Write-Host ""
            npm start
            Write-Host "`nServer stopped. Press any key to continue..."
            Read-Host
        }

        "2" {
            Write-Section "Starting server + client"
            Write-Host "Browser will open automatically" -ForegroundColor Magenta
            Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
            Write-Host ""
            npm run start:all
            Write-Host "`nServer stopped. Press any key to continue..."
            Read-Host
        }

        "3" {
            Write-Section "Starting with auto-restart (npm run dev)"
            Write-Host "Requires 'nodemon' to be installed" -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
            Write-Host ""

            # Check if nodemon exists
            $nodemon = npm list nodemon 2>&1 | Select-String "nodemon"
            if ($nodemon) {
                npm run dev
            } else {
                Write-Host "Installing nodemon..." -ForegroundColor Yellow
                npm install --save-dev nodemon
                npm run dev
            }

            Write-Host "`nServer stopped. Press any key to continue..."
            Read-Host
        }

        "4" {
            Write-Section "Testing OKX WebSocket connection"
            Write-Host "Testing API connectivity..." -ForegroundColor Yellow
            Write-Host ""

            try {
                $response = Invoke-WebRequest -Uri "https://www.okx.com/api/v5/public/time" -UseBasicParsing -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Info "OKX API: Connected ✓"
                    Write-Host $response.Content -ForegroundColor Gray
                } else {
                    Write-Err "OKX API: Connection failed (Status: $($response.StatusCode))"
                }
            } catch {
                Write-Err "OKX API: $($_.Exception.Message)"
            }

            Write-Host "`nPress any key to continue..."
            Read-Host
        }

        "5" {
            Write-Section "Current .env file"
            if (Test-Path ".env") {
                Get-Content ".env" | Write-Host -ForegroundColor Yellow
            } else {
                Write-Err ".env file not found"
            }
            Write-Host "`nPress any key to continue..."
            Read-Host
        }

        "6" {
            Write-Info "Opening .env in Notepad..."
            notepad ".env"
            Write-Host "`nFile saved. Press any key to continue..."
            Read-Host
        }

        "7" {
            Write-Section "Windows Service Installation"
            Write-Host @"
To create a Windows Service using NSSM:

1. Download NSSM from: https://nssm.cc/download
2. Extract to: C:\tools\nssm\

3. Run these commands as Administrator:

   Set-Location C:\tools\nssm\win64
   .\nssm.exe install 3ATrading "C:\Program Files\nodejs\node.exe" "$pwd\server.js"
   .\nssm.exe set 3ATrading AppDirectory "$pwd"
   .\nssm.exe set 3ATrading Start SERVICE_AUTO_START
   .\nssm.exe set 3ATrading Type SERVICE_WIN32_OWN_PROCESS
   .\nssm.exe start 3ATrading

4. Verify:
   .\nssm.exe status 3ATrading

5. To remove service:
   .\nssm.exe remove 3ATrading confirm

"@ -ForegroundColor Yellow

            Write-Host "Open browser to NSSM download page? (Y/N): " -NoNewline -ForegroundColor Cyan
            $response = Read-Host
            if ($response -eq "Y" -or $response -eq "y") {
                Start-Process "https://nssm.cc/download"
            }

            Write-Host "`nPress any key to continue..."
            Read-Host
        }

        "8" {
            Write-Section "System Status"

            # Node processes
            Write-Host "Running Node.js processes:" -ForegroundColor Yellow
            Get-Process node -ErrorAction SilentlyContinue | Select-Object ProcessName, CPU, Memory, Handles | Format-Table

            if ($LASTEXITCODE -ne 0) {
                Write-Info "No Node.js processes running"
            }

            # Port 3000
            Write-Host "Checking port 3000..." -ForegroundColor Yellow
            $port3000 = netstat -ano | Select-String ":3000"
            if ($port3000) {
                Write-Host $port3000 -ForegroundColor Yellow
                Write-Info "Port 3000 is in use"
            } else {
                Write-Info "Port 3000 is available"
            }

            # Disk space
            Write-Host "`nDisk Space:" -ForegroundColor Yellow
            Get-Volume | Where-Object {$_.DriveLetter} | Select-Object DriveLetter, FileSystemType, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="Free(GB)";Expression={[math]::Round($_.SizeRemaining/1GB,2)}} | Format-Table

            # Memory
            Write-Host "System Memory:" -ForegroundColor Yellow
            $memory = Get-WmiObject -Class win32_operatingsystem
            $memUsed = [math]::Round(($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / 1MB, 2)
            $memTotal = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
            Write-Host "Used: $memUsed MB / $memTotal MB" -ForegroundColor Gray

            Write-Host "`nPress any key to continue..."
            Read-Host
        }

        "9" {
            $isRunning = $false
            Write-Section "Setup Complete!"
            Write-Host @"
Next steps:

1. Edit .env with Telegram credentials
   - Get bot token from @BotFather
   - Get chat ID from @userinfobot

2. Test the system:
   npm start

3. Set up Windows Service for 24/7 operation:
   - Install NSSM
   - Run command from option [7]

4. Monitor the bot:
   - Web dashboard: http://localhost:3000
   - Telegram notifications
   - PowerShell logs

5. Configure tokens/timeframes in:
   - server/config.js
   - client/chart-3a.js

Need help? Check DEPLOY-WINDOWS-VPS.md

Happy trading! 🚀

"@ -ForegroundColor Green
        }

        default {
            Write-Err "Invalid option. Please select 1-9."
            Start-Sleep -Seconds 2
        }
    }
}

Write-Host "Goodbye!" -ForegroundColor Cyan
