# Fast Push to GitHub Script
# Run: powershell -ExecutionPolicy Bypass -File push-github-fast.ps1

Write-Host "`n🚀 3A Trading System - Push to GitHub`n" -ForegroundColor Cyan

# Check Git
if (-NOT (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git not installed!" -ForegroundColor Red
    Write-Host "Download: https://git-scm.com/download/win`n" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[✓] Git: $(git --version)" -ForegroundColor Green

# Get directory
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir

Write-Host "[✓] Directory: $pwd`n" -ForegroundColor Green

# Config Git
Write-Host "[1/6] Configuring Git..." -ForegroundColor Yellow
git config --global user.name "Thuan Trading Bot"
git config --global user.email "thuanhgmakeatradingbot@gmail.com"
Write-Host "[✓] Git configured`n" -ForegroundColor Green

# Initialize repo
if (Test-Path .git) {
    Write-Host "[2/6] Git repository already exists" -ForegroundColor Green
} else {
    Write-Host "[2/6] Initializing repository..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit - 3A Trading System with Windows VPS deployment"
    Write-Host "[✓] Repository initialized`n" -ForegroundColor Green
}

# Setup remote
Write-Host "[3/6] Adding GitHub remote..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/thuanhgmakeatradingbot/faketradingview.git
Write-Host "[✓] Remote added`n" -ForegroundColor Green

# Verify remote
Write-Host "[4/6] Verifying remote:" -ForegroundColor Yellow
git remote -v
Write-Host ""

# Rename branch
Write-Host "[5/6] Renaming branch to main..." -ForegroundColor Yellow
git branch -M main 2>$null
git symbolic-ref HEAD refs/heads/main 2>$null
Write-Host "[✓] Branch renamed`n" -ForegroundColor Green

# Push
Write-Host "[6/6] Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "Enter GitHub credentials when prompted`n" -ForegroundColor Magenta

git push -u origin main

# Result
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n" -ForegroundColor Green
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║ ✅ SUCCESS! Code pushed to GitHub         ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Repository: https://github.com/thuanhgmakeatradingbot/faketradingview" -ForegroundColor Cyan
    Write-Host "📍 Branch: main" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎉 Ready to deploy on Windows VPS!" -ForegroundColor Green
} else {
    Write-Host "`n" -ForegroundColor Red
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║ ❌ Push failed                             ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshoot:" -ForegroundColor Yellow
    Write-Host "1. Check credentials (username/token)" -ForegroundColor Yellow
    Write-Host "2. Verify repo exists: https://github.com/thuanhgmakeatradingbot/faketradingview" -ForegroundColor Yellow
    Write-Host "3. Token must have 'repo' scope" -ForegroundColor Yellow
    Write-Host "4. Repo must be PUBLIC" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
