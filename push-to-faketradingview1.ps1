# Push to faketradingview1 repository
# Run: powershell -ExecutionPolicy Bypass -File push-to-faketradingview1.ps1

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Push to: faketradingview1`n" -ForegroundColor Cyan

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

# Step 1: Config
Write-Host "[STEP 1/5] Configuring Git..." -ForegroundColor Yellow
git config --global user.name "Thuan Trading Bot"
git config --global user.email "thuanhgmakeatradingbot@gmail.com"
Write-Host "[✓] Configured`n" -ForegroundColor Green

# Step 2: Remote
Write-Host "[STEP 2/5] Setting up remote..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/thuanhgmakeatradingbot/faketradingview1.git
Write-Host "[✓] Remote added`n" -ForegroundColor Green
git remote -v
Write-Host ""

# Step 3: Branch
Write-Host "[STEP 3/5] Renaming branch to main..." -ForegroundColor Yellow
git branch -M main 2>$null
Write-Host "[✓] Branch renamed`n" -ForegroundColor Green
git branch -a
Write-Host ""

# Step 4: Add files
Write-Host "[STEP 4/5] Adding files..." -ForegroundColor Yellow
git add .
git status --short
Write-Host "[✓] Files added`n" -ForegroundColor Green

# Step 5: Push
Write-Host "[STEP 5/5] Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "Repository: https://github.com/thuanhgmakeatradingbot/faketradingview1" -ForegroundColor Magenta
Write-Host "Branch: main`n" -ForegroundColor Magenta

git push -u origin main 2>&1

# Result
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n" -ForegroundColor Green
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║ ✅ SUCCESS! Code pushed to faketradingview1               ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Repository: https://github.com/thuanhgmakeatradingbot/faketradingview1" -ForegroundColor Cyan
    Write-Host "📍 Branch: main" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎉 Ready to deploy on Windows VPS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Clone on VPS" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/thuanhgmakeatradingbot/faketradingview1.git" -ForegroundColor Gray
    Write-Host "  cd faketradingview1" -ForegroundColor Gray
    Write-Host "  npm install && npm start" -ForegroundColor Gray
} else {
    Write-Host "`n" -ForegroundColor Red
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║ ❌ Push failed                                            ║" -ForegroundColor Red
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshoot:" -ForegroundColor Yellow
    Write-Host "1. Check repo exists: https://github.com/thuanhgmakeatradingbot/faketradingview1" -ForegroundColor Yellow
    Write-Host "2. Repo must be PUBLIC" -ForegroundColor Yellow
    Write-Host "3. Check credentials (username/token)" -ForegroundColor Yellow
    Write-Host "4. Token must have 'repo' scope" -ForegroundColor Yellow
    Write-Host "5. Check git: git --version" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
