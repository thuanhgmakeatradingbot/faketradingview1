# 📚 Windows VPS Deployment - Complete Guide Index

## 🎯 Hướng dẫn chi tiết deploy 3A Trading System trên Windows Server/VPS

---

## 📖 Danh sách các hướng dẫn

### 1️⃣ **START HERE** - Nếu bạn chưa biết bắt đầu từ đâu
**File:** `DEPLOY-WINDOWS-VPS.md`
- Hướng dẫn chi tiết từng bước
- Từ cài đặt Node.js đến chạy bot 24/7
- Cấu hình Telegram notifications
- Troubleshooting
- **Dài:** ~400 dòng, **Thời gian:** 30-45 phút

### 2️⃣ **Quick Start** - Nếu bạn muốn nhanh chóng
**File:** `QUICK-REFERENCE-WINDOWS.md`
- Tóm tắt các command cần thiết
- Reference nhanh cho troubleshooting
- Command cheat sheet
- **Dài:** ~300 dòng, **Thời gian:** 5-10 phút

### 3️⃣ **Telegram Setup** - Cấu hình Telegram notifications
**File:** `TELEGRAM-SETUP-DETAILED.md`
- Hướng dẫn tạo Telegram bot chi tiết
- Lấy Chat ID (2 cách)
- Cấu hình .env
- Test & troubleshooting Telegram
- **Dài:** ~250 dòng, **Thời gian:** 15-20 phút

### 4️⃣ **Automated Setup** - Scripts tự động
**Files:**
- `setup-windows.bat` - Batch script (dễ dùng)
- `setup-windows.ps1` - PowerShell script (advanced)

**Tính năng:**
- Tự động cài npm dependencies
- Tạo .env file
- Menu tương tác
- Test connections
- Setup Windows Service
- **Thời gian:** 5-10 phút

---

## 🚀 3 Cách Deploy

### 🥇 **Cách 1: Dùng Script (Khuyến nghị cho người mới)**

```powershell
# Copy project lên VPS
# Sau đó:
cd C:\3a-trading-bot
powershell -ExecutionPolicy Bypass -File setup-windows.ps1

# Follow menu
# Done!
```

**Ưu điểm:**
- ✅ Tự động hóa
- ✅ Interactive menu
- ✅ Error checking
- ✅ Dễ dùng

**Tham khảo:** `setup-windows.ps1` hoặc `setup-windows.bat`

---

### 🥈 **Cách 2: Manual Setup (Dành cho advanced users)**

```powershell
# 1. Install Node.js từ nodejs.org
# 2. Download code
# 3. npm install
# 4. Configure .env
# 5. npm start
# 6. Setup NSSM service
```

**Ưu điểm:**
- ✅ Kiểm soát tối đa
- ✅ Hiểu rõ từng bước
- ✅ Dễ customize

**Tham khảo:** `DEPLOY-WINDOWS-VPS.md` (Section: BƯỚC 1-11)

---

### 🥉 **Cách 3: Docker (Advanced)**

Không được mention trong docs nhưng có thể dùng Docker nếu có.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

---

## 📋 Recommended Learning Path

### Cho người mới

1. **Đọc:** `QUICK-REFERENCE-WINDOWS.md` (5 phút)
   - Hiểu cái gì cần làm

2. **Chạy:** `setup-windows.ps1` (10 phút)
   - Automated setup

3. **Setup:** `TELEGRAM-SETUP-DETAILED.md` (20 phút)
   - Configure Telegram

4. **Done!** Bot chạy 24/7 ✅

**Total time:** ~35-45 phút

---

### Cho người advanced

1. **Đọc:** `DEPLOY-WINDOWS-VPS.md` (20 phút)
   - Hiểu toàn bộ process

2. **Setup manual** hoặc **dùng script**

3. **Customize:**
   - Edit `server/config.js`
   - Thêm coins/timeframes
   - Adjust parameters

4. **Deploy** & **Monitor**

**Total time:** ~1-2 giờ

---

## ⚡ Quick Deploy (5 phút)

```powershell
# 1. SSH to VPS
mstsc  # Remote Desktop

# 2. Clone project
cd Desktop
git clone https://github.com/YOUR_USERNAME/3a-trading-bot.git
cd 3a-trading-bot

# 3. Run setup script
powershell -ExecutionPolicy Bypass -File setup-windows.ps1

# 4. Follow menu:
#    - [1] npm start (test)
#    - [7] NSSM service (production)

# 5. Configure Telegram (via .env)

# Done! Bot is running 24/7
```

---

## 🔍 Troubleshooting by Issue

| Issue | Solution | File |
|-------|----------|------|
| Bot không khởi động | Check logs & path | `QUICK-REFERENCE-WINDOWS.md` (Troubleshooting) |
| Port 3000 bị chiếm | Kill process | `QUICK-REFERENCE-WINDOWS.md` (Emergency) |
| Telegram không tới | Check token & chat ID | `TELEGRAM-SETUP-DETAILED.md` (Troubleshooting) |
| OKX connection error | Test internet & API | `QUICK-REFERENCE-WINDOWS.md` (Troubleshooting) |
| CPU/Memory quá cao | Reduce tokens/timeframes | `DEPLOY-WINDOWS-VPS.md` (Performance) |
| Windows Service error | Reinstall NSSM | `DEPLOY-WINDOWS-VPS.md` (Bước 6) |

---

## 🎛️ Configuration Reference

### Thay đổi Coins theo dõi

File: `server/config.js`

```javascript
coins: ['XAUT', 'BTC', 'ETH', 'SOL']  // Thêm hoặc bớt coins
```

---

### Thay đổi Timeframes

File: `server/config.js`

```javascript
timeframes: ['1H', '4H', '1D']  // 1M, 5M, 15M, 30M, 1H, 2H, 4H, 6H, 12H, 1D, 1W, 1M
```

---

### Thay đổi Strategy Parameters

File: `server/services/signal-detector.js` hoặc `signals-3a.js`

```javascript
const STRATEGY_CONFIG = {
  volMultiplier: 1.5,      // Volume threshold (1.5x = 50% trên average)
  absorbBodyRatio: 0.35,   // Absorption detection (35% body)
  aggrBodyRatio: 0.6,      // Aggression detection (60% body)
  slMultiplier: 1.5        // Stop loss multiplier (1.5 ATR)
};
```

---

### Thay đổi Telegram Notifications

File: `.env`

```
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## 🛠️ Useful Commands Reference

### Start/Stop Bot

```powershell
# Start
nssm start 3ATrading

# Stop
nssm stop 3ATrading

# Restart
nssm restart 3ATrading

# Status
nssm status 3ATrading
```

---

### View Logs

```powershell
# NSSM logs
Get-Content "C:\Program Files\nssm\3ATrading\out.log" -Tail 50

# PM2 logs (nếu dùng PM2)
pm2 logs 3ATrading

# PowerShell
Get-EventLog -LogName Application | findstr "Node"
```

---

### Check System

```powershell
# Node processes
Get-Process node

# Port 3000
netstat -ano | findstr :3000

# Disk space
Get-Volume

# Memory
Get-WmiObject -Class win32_operatingsystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory
```

---

## 🔐 Security Checklist

- [ ] .env file permissions restricted (Admin only)
- [ ] Firewall configured for port 3000
- [ ] Bot token not shared publicly
- [ ] Regular backups of config
- [ ] Monitor logs for errors
- [ ] Update Node.js periodically
- [ ] Restart bot after major updates

---

## 📊 Expected Output

### Successful Startup (Logs)

```
✅ Server listening on port 3000
✅ Connected to OKX WebSocket
✅ Started 8 monitors (4 tokens × 2 timeframes)
✅ XAUT-USDT (1H) started
✅ XAUT-USDT (4H) started
✅ BTC-USDT (1H) started
✅ BTC-USDT (4H) started
✅ ETH-USDT (1H) started
✅ ETH-USDT (4H) started
✅ SOL-USDT (1H) started
✅ SOL-USDT (4H) started
📱 Telegram notifications: ENABLED
🎯 Bot ready for trading! 🚀
```

### Signal Example

```
🚀 BUY SIGNAL - 3A STRATEGY

📊 BTC-USDT-SWAP (1H)
💰 Entry: $75,230.50

🎯 Targets:
🛡️ SL: $74,850.20 (1.85%)
💎 TP: $75,610.80

📋 Pattern: Simple 3A
🔄 Phase: Accumulation

#3AStrategy #BTC #OrderFlow
```

---

## 🎓 Learning Resources

| Resource | Type | Purpose |
|----------|------|---------|
| `DEPLOY-WINDOWS-VPS.md` | Guide | Full step-by-step |
| `QUICK-REFERENCE-WINDOWS.md` | Reference | Commands & troubleshooting |
| `TELEGRAM-SETUP-DETAILED.md` | Tutorial | Telegram setup |
| `setup-windows.ps1` | Script | Automated setup |
| `server/config.js` | Config | System configuration |
| `SETUP.md` | Doc | Initial setup |
| `README.md` | Doc | Project overview |

---

## 🎯 Success Criteria

After deployment, verify:

- [ ] Web dashboard at `http://[IP]:3000` loads
- [ ] Real-time price updates showing
- [ ] Charts loading data
- [ ] Telegram receives test message
- [ ] Bot logs show "Started 8 monitors"
- [ ] Windows Service running 24/7
- [ ] Can restart service without errors
- [ ] No memory leaks (monitor RAM usage)

---

## 🚀 Next Steps After Deployment

1. **Monitor for 24-48 hours**
   - Check logs daily
   - Verify Telegram notifications

2. **Fine-tune parameters**
   - Adjust `volMultiplier`
   - Adjust `slMultiplier`
   - Add/remove timeframes

3. **Optimize costs**
   - Monitor CPU/memory
   - Reduce tokens if needed
   - Adjust check intervals

4. **Scale up**
   - Add more coins
   - Add more timeframes
   - Integrate with exchanges

---

## 📞 Support & Community

- **Telegram:** @BotFather (for bot creation)
- **OKX Docs:** https://www.okx.com/docs-v5/
- **Node.js Docs:** https://nodejs.org/docs/
- **Windows Reference:** https://docs.microsoft.com/windows/

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-12 | Initial release |

---

## 💡 Pro Tips

1. **Backup your config:**
   ```powershell
   Copy-Item .env .env.backup
   Copy-Item server\config.js server\config.js.backup
   ```

2. **Monitor resources:**
   ```powershell
   Get-Process node | Select-Object CPU, Memory | Format-Table -AutoSize
   ```

3. **Schedule restarts (optional):**
   ```powershell
   # Daily restart at 2 AM
   # Use Task Scheduler
   ```

4. **Keep logs:**
   ```powershell
   # Archive logs periodically
   Get-Content out.log | Out-File "logs\out-$(Get-Date -Format 'yyyy-MM-dd').log"
   ```

---

**Happy Trading! 🚀💰**

**Last Updated:** August 12, 2026
