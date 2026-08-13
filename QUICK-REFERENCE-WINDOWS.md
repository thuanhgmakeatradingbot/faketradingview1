# 🚀 Quick Reference - Windows VPS Deployment

## ⚡ 5 Phút Setup (Quick Start)

### 1. SSH vào VPS
```powershell
mstsc  # Mở Remote Desktop
# Server: [IP_VPS]
# Username: Administrator
```

### 2. Download & Run Setup Script
```powershell
# Trong PowerShell (Run as Administrator):
cd Desktop
git clone https://github.com/YOUR_USERNAME/3a-trading-bot.git
cd 3a-trading-bot

# Cách A: Dùng PowerShell script
powershell -ExecutionPolicy Bypass -File setup-windows.ps1

# Cách B: Dùng Batch script
setup-windows.bat
```

### 3. Edit .env file
```
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 4. Test chạy
```powershell
npm start
# Truy cập: http://localhost:3000
```

### 5. Set up Windows Service
```powershell
# Dùng NSSM hoặc PM2 (xem chi tiết dưới)
nssm install 3ATrading "C:\Program Files\nodejs\node.exe" "C:\3a-trading-bot\server.js"
nssm start 3ATrading
```

---

## 📦 Cấu trúc thư mục trên Windows

```
C:\3a-trading-bot\
├── server.js                 # Entry point
├── .env                       # Environment variables
├── package.json
├── client\                    # Web dashboard
│   ├── index.html
│   ├── chart-3a.js
│   └── signals-3a.js
├── server\
│   ├── config.js
│   ├── services\
│   │   ├── okx-client.js
│   │   ├── signal-detector.js
│   │   ├── coin-monitor.js
│   │   └── telegram.js
```

---

## 🔧 Command Reference

### Chạy Bot

```powershell
# Chạy server only
npm start

# Chạy server + open browser
npm run start:all

# Chạy với auto-restart (needs nodemon)
npm run dev

# Chạy trong background (PM2)
pm2 start server.js --name "3ATrading"
```

### Kiểm tra Status

```powershell
# Dùng NSSM
nssm status 3ATrading

# Dùng PM2
pm2 status

# Dùng netstat
netstat -ano | findstr :3000
```

### Stop/Restart Service

```powershell
# NSSM
nssm stop 3ATrading
nssm restart 3ATrading

# PM2
pm2 stop 3ATrading
pm2 restart 3ATrading

# Process
Get-Process node | Stop-Process -Force
```

### View Logs

```powershell
# NSSM logs (xem file)
Get-Content "C:\Program Files\nssm\3ATrading\out.log"

# PM2 logs
pm2 logs 3ATrading

# PowerShell logs
Get-EventLog -LogName Application -Source NodeJS
```

---

## 📋 Setup Telegram

### Bước 1: Tạo Bot (@BotFather)
```
1. Open Telegram
2. Search: @BotFather
3. Send: /newbot
4. Bot name: 3A Trading Bot
5. Bot username: my3a_trading_bot
6. Copy token!
```

### Bước 2: Lấy Chat ID (@userinfobot)
```
1. Search: @userinfobot
2. Start bot
3. It sends you: Your ID
4. Copy chat ID!
```

### Bước 3: Update .env
```powershell
notepad C:\3a-trading-bot\.env

# Thêm:
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOpqrstuvwxyz
TELEGRAM_CHAT_ID=987654321
```

### Bước 4: Restart
```powershell
nssm restart 3ATrading
```

---

## 🐛 Troubleshooting

### Bot không khởi động
```powershell
# Check logs
nssm query 3ATrading

# Check path
Test-Path "C:\3a-trading-bot\server.js"

# Check Node.js
where node

# Manual test
cd C:\3a-trading-bot
npm start
```

### Port 3000 bị chiếm
```powershell
# Tìm process
netstat -ano | findstr :3000

# Kill process (ghi nhớ PID)
taskkill /PID [PID] /F

# Hoặc dùng netsh
netsh int ipv4 show tcpconn | findstr 3000
```

### Telegram không tới
```powershell
# Check .env file
type .env

# Test token
curl "https://api.telegram.org/bot[TOKEN]/getMe"

# Test chat
curl "https://api.telegram.org/bot[TOKEN]/getUpdates"

# Restart service
nssm restart 3ATrading
```

### OKX connection error
```powershell
# Test internet
ping 8.8.8.8

# Test OKX
curl "https://www.okx.com/api/v5/public/time"

# Check firewall
Get-NetFirewallProfile

# Check logs
Get-Content out.log | Select-String "WebSocket"
```

---

## 📊 Monitoring Commands

### System Resource
```powershell
# CPU & Memory
Get-Process node | Select-Object ProcessName, CPU, Memory

# Disk space
Get-Volume

# Network
Get-NetStatistics

# Processes running
tasklist | findstr node
```

### Port & Network
```powershell
# Check port 3000
netstat -ano | findstr :3000

# Check all listening ports
netstat -tuln

# DNS resolution
nslookup www.okx.com
```

---

## 🔒 Security Tips

### Protect .env
```powershell
# Only allow Admin to read
icacls C:\3a-trading-bot\.env /grant:r "%username%:F" /inheritance:r

# Verify permissions
icacls C:\3a-trading-bot\.env
```

### Firewall Rules
```powershell
# View rules
Get-NetFirewallRule | findstr 3000

# Add rule
New-NetFirewallRule -DisplayName "3ATrading" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000

# Remove rule
Remove-NetFirewallRule -DisplayName "3ATrading"
```

### Backup
```powershell
# Backup config
Copy-Item .env .env.backup
Copy-Item server\config.js server\config.js.backup
```

---

## 🎛️ Configuration Files

### server/config.js
```javascript
// Thay đổi tokens
coins: ['XAUT', 'BTC', 'ETH', 'SOL']

// Thay đổi timeframes
timeframes: ['1H', '4H']

// Thay đổi strategy parameters
volMultiplier: 1.5
absorbBodyRatio: 0.35
aggrBodyRatio: 0.6
```

### .env file
```
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
LOG_LEVEL=info
PORT=3000
```

---

## 📈 Performance Tuning

### Increase Memory
```javascript
// server.js
node --max-old-space-size=2048 server.js
```

### Reduce CPU
```javascript
// Increase monitor interval (ms)
checkInterval: 60000  // 1 minute instead of 10 seconds
```

### Limit Tokens/Timeframes
```javascript
coins: ['BTC', 'ETH']      // Giảm coins
timeframes: ['1H']         // Giảm timeframes
```

---

## 🚨 Emergency Commands

### Restart everything
```powershell
# Stop service
nssm stop 3ATrading
taskkill /F /IM node.exe

# Start service
nssm start 3ATrading

# Verify
nssm status 3ATrading
```

### Check everything
```powershell
# Node running?
Get-Process node

# Port 3000?
netstat -ano | findstr :3000

# .env exists?
Test-Path .env

# npm modules?
Test-Path node_modules

# Logs?
Get-Content "C:\Program Files\nssm\3ATrading\out.log"
```

### Clean restart
```powershell
# Remove service
nssm remove 3ATrading confirm

# Kill process
taskkill /F /IM node.exe

# Delete node_modules
Remove-Item -Recurse node_modules
npm install

# Recreate service
nssm install 3ATrading "C:\Program Files\nodejs\node.exe" "C:\3a-trading-bot\server.js"
nssm start 3ATrading
```

---

## 🎯 Useful Links

| Link | Mục đích |
|------|---------|
| https://nodejs.org | Download Node.js |
| https://nssm.cc | Windows Service Manager |
| https://pm2.keymetrics.io | Process Manager |
| https://www.okx.com/api | OKX API Docs |
| https://t.me/BotFather | Telegram Bot Creator |
| https://status.okx.com | OKX Status Page |

---

## 🔄 Typical Workflow

```
1. SSH to VPS
2. cd C:\3a-trading-bot
3. Edit .env with credentials
4. Test: npm start
5. Setup service: nssm install...
6. Restart: nssm restart 3ATrading
7. Monitor: nssm status 3ATrading
8. Check: http://[IP]:3000
9. Verify Telegram notifications arrive
10. Done! Bot runs 24/7
```

---

## 📞 Support

**Có lỗi?** Check:
1. .env file correct?
2. Logs clear?
3. OKX API working?
4. Telegram token valid?
5. Port 3000 available?
6. Internet connection stable?

**Docs:**
- Full guide: DEPLOY-WINDOWS-VPS.md
- Setup: SETUP.md
- Config: server/config.js

---

**Last Updated:** 2026-08-12  
**Status:** ✅ Ready for deployment
