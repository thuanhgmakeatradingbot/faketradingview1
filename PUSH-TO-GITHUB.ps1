# Script để push code lên GitHub
# Chạy: powershell -ExecutionPolicy Bypass -File PUSH-TO-GITHUB.ps1

# Di chuyển vào thư mục project
cd $PSScriptRoot

Write-Host "🚀 Pushing 3A Trading System to GitHub..." -ForegroundColor Cyan
Write-Host ""

# Kiểm tra git đã được cài
if (-NOT (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git not installed!" -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Git found: $(git --version)" -ForegroundColor Green
Write-Host ""

# Config git
Write-Host "[STEP 1] Configure Git..." -ForegroundColor Yellow
git config --global user.email "thuanhgmakeatradingbot@gmail.com"
git config --global user.name "Thuan Trading"

# Initialize git repo nếu chưa có
if (-NOT (Test-Path .git)) {
    Write-Host "[STEP 2] Initialize Git repository..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit - 3A Trading System with Windows VPS deployment guides"
} else {
    Write-Host "[STEP 2] Git repository already exists" -ForegroundColor Green
    # Add remote nếu chưa có
    $remoteCheck = git remote -v 2>$null
    if ([string]::IsNullOrEmpty($remoteCheck)) {
        Write-Host "[STEP 2b] Adding remote..." -ForegroundColor Yellow
    }
}

# Rename branch to main
Write-Host "[STEP 3] Renaming branch to 'main'..." -ForegroundColor Yellow
git branch -M main 2>$null

# Add remote origin
Write-Host "[STEP 4] Adding GitHub remote..." -ForegroundColor Yellow
git remote remove origin 2>$null  # Remove if exists
git remote add origin https://github.com/thuanhgmakeatradingbot/faketradingview.git

# Verify remote
Write-Host "[STEP 5] Verifying remote..." -ForegroundColor Yellow
git remote -v

# Push to GitHub
Write-Host "[STEP 6] Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "This will prompt for GitHub credentials..." -ForegroundColor Magenta
Write-Host ""

git push -u origin main

# Check result
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Code pushed to GitHub" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Repository: https://github.com/thuanhgmakeatradingbot/faketradingview" -ForegroundColor Cyan
    Write-Host "📍 Branch: main" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎉 Ready to deploy on Windows VPS!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Push failed" -ForegroundColor Red
    Write-Host "Try these steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure you have GitHub account and repo created"
    Write-Host "2. Check git is installed correctly: git --version"
    Write-Host "3. Configure git: git config --global user.name 'Your Name'"
    Write-Host "4. Try push manually: git push -u origin main"
}

Write-Host ""
Read-Host "Press Enter to exit"
