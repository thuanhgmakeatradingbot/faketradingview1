# 🚀 Hướng dẫn Deploy 3A Trading System trên Windows VPS

## 📋 Yêu cầu hệ thống

- Windows Server 2016+ hoặc Windows 10/11 Pro
- Node.js v16+ (https://nodejs.org/)
- RAM: 2GB tối thiểu, 4GB khuyến nghị
- Disk: 5GB trống
- Internet connection: Stable 24/7

---

## 🔧 BƯỚC 1: Chuẩn bị VPS Windows

### 1.1. Remote Desktop vào VPS
```
Mở Remote Desktop Connection (RDP)
- Server: [IP_VPS]
- Username: Administrator (hoặc user khác)
- Password: [Password]
```

### 1.2. Tắt Firewall (Optional, chỉ để test)
```powershell
# Mở PowerShell as Administrator
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled $false
```

Hoặc chỉ cho phép port:
```powershell
# Cho phép port 3000
New-NetFirewallRule -DisplayName "Allow Port 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

---

## 📥 BƯỚC 2: Cài đặt Node.js

### 2.1. Download Node.js
1. Truy cập: https://nodejs.org/
2. Download **LTS version** (ví dụ: 20.x)
3. Chọn **Windows Installer (.msi)**

### 2.2. Cài đặt Node.js
```
1. Double-click file .msi
2. Click "Next" và chấp nhận các options
3. Đảm bảo "Add to PATH" được chọn
4. Click "Install"
5. Restart máy hoặc Command Prompt
```

### 2.3. Kiểm tra cài đặt
```powershell
node --version
npm --version
```

Kết quả:
```
v20.x.x
9.x.x
```

---

## 📂 BƯỚC 3: Upload Code lên VPS

### Cách 1: Dùng Git (Khuyến nghị)

```powershell
# Mở PowerShell as Administrator
cd C:\Users\Administrator\Desktop

# Clone project
git clone https://github.com/YOUR_USERNAME/3a-trading-bot.git
cd 3a-trading-bot

# Cài dependencies
npm install
```

### Cách 2: Dùng SCP/WinSCP
1. Download WinSCP: https://winscp.net/
2. Connect đến VPS
3. Upload thư mục project
4. Run `npm install`

### Cách 3: Tạo thủ công
```powershell
# Tạo thư mục
mkdir C:\3a-trading-bot
cd C:\3a-trading-bot

# Copy các file cần thiết:
# - package.json
# - server/
# - client/
# - config.js
```

---

## ⚙️ BƯỚC 4: Cấu hình Environment Variables

### 4.1. Tạo file `.env`
```powershell
cd C:\3a-trading-bot

# Tạo file .env (dùng Notepad hoặc PowerShell)
# Cách 1: Dùng Notepad
notepad .env

# Cách 2: Dùng PowerShell
@"
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1002799528264
"@ | Out-File -Encoding UTF8 .env
```

### 4.2. Nội dung file `.env`
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 4.3. Kiểm tra file `.env` đã tạo
```powershell
cat .env  # Hoặc: Get-Content .env
```

---

## 🚀 BƯỚC 5: Chạy hệ thống

### 5.1. Test chạy thủ công
```powershell
cd C:\3a-trading-bot

# Chạy server
npm start

# Hoặc chạy cả server + client
npm run start:all
```

**Kết quả mong đợi:**
```
✅ Server listening on port 3000
✅ Started 8 monitors (4 tokens × 2 timeframes)
📱 Telegram notifications: ENABLED
```

### 5.2. Truy cập Web Dashboard
```
Browser: http://localhost:3000
hoặc: http://[IP_VPS]:3000
```

---

## 🔄 BƯỚC 6: Chạy bot 24/7 (Windows Service)

### Cách 1: Dùng NSSM (Node Simple Service Manager) - **KHUYẾN NGHỊ**

```powershell
# 1. Download NSSM từ: https://nssm.cc/download
# Hoặc dùng PowerShell:
curl -o nssm.zip https://nssm.cc/ci/nssm-2.24-101-g897c7f7.zip
Expand-Archive nssm.zip

# 2. Copy NSSM vào thư mục system
copy nssm\nssm-2.24\win64\nssm.exe C:\Windows\System32\

# 3. Tạo service
nssm install 3ATrading "C:\Program Files\nodejs\node.exe" "C:\3a-trading-bot\server.js"

# 4. Set working directory
nssm set 3ATrading AppDirectory C:\3a-trading-bot

# 5. Set chế độ auto-start
nssm set 3ATrading Start SERVICE_AUTO_START

# 6. Start service
nssm start 3ATrading

# 7. Kiểm tra status
nssm status 3ATrading
```

### Cách 2: Dùng PM2

```powershell
# Install PM2 globally
npm install -g pm2

# Start server với PM2
pm2 start server.js --name "3ATrading"

# Set auto-restart on reboot
pm2 startup windows

# Save configuration
pm2 save

# Check status
pm2 list
```

### Cách 3: Dùng Task Scheduler (Đơn giản)

```powershell
# 1. Tạo batch file: C:\3a-trading-bot\start.bat
# Nội dung:
cd C:\3a-trading-bot
npm start

# 2. Mở Task Scheduler (Ctrl + Shift + Esc)
# 3. Create Basic Task
# 4. Trigger: At log on
# 5. Action: Start program → C:\3a-trading-bot\start.bat
# 6. Enable "Run with highest privileges"
```

---

## 📊 BƯỚC 7: Monitoring & Troubleshooting

### 7.1. Kiểm tra logs
```powershell
# Nếu dùng NSSM:
nssm query 3ATrading

# Nếu dùng PM2:
pm2 logs 3ATrading

# Nếu chạy thủ công:
# Xem lại Command Prompt/PowerShell window
```

### 7.2. Kiểm tra kết nối internet
```powershell
# Test OKX API
curl -i https://www.okx.com/api/v5/public/time

# Test Telegram
curl -i "https://api.telegram.org/bot[BOT_TOKEN]/getMe"
```

### 7.3. Kiểm tra port đang được sử dụng
```powershell
netstat -ano | findstr :3000
```

### 7.4. Kill process nếu port bị chiếm
```powershell
# Tìm PID của process
Get-Process | findstr node

# Hoặc:
netstat -ano | findstr :3000
# Ghi nhớ PID

# Kill process
taskkill /PID [PID] /F
```

---

## 🔑 BƯỚC 8: Thiết lập Telegram Notifications

### 8.1. Tạo Telegram Bot
1. Mở Telegram, tìm **@BotFather**
2. Gửi: `/newbot`
3. Đặt tên: `3A Trading Bot`
4. Đặt username: `my3a_trading_bot`
5. **Lưu Token** (VD: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 8.2. Lấy Chat ID
**Cách A: Từ @userinfobot**
1. Tìm **@userinfobot** trên Telegram
2. Start bot
3. Bot sẽ gửi Chat ID của bạn

**Cách B: Từ Group**
1. Tạo group Telegram
2. Add bot vào group
3. Gửi tin nhắn bất kỳ
4. Truy cập: `https://api.telegram.org/bot[BOT_TOKEN]/getUpdates`
5. Tìm `"chat":{"id":-1002799528264}`

### 8.3. Update file `.env`
```powershell
notepad C:\3a-trading-bot\.env

# Cập nhật:
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 8.4. Restart service
```powershell
# Nếu dùng NSSM:
nssm stop 3ATrading
nssm start 3ATrading

# Nếu dùng PM2:
pm2 restart 3ATrading

# Nếu dùng Task Scheduler:
# Restart thủ công hoặc reboot máy
```

---

## 📈 BƯỚC 9: Tùy chỉnh Config

### 9.1. Thay đổi Tokens theo dõi
```powershell
# Edit config.js
notepad server\config.js

# Tìm dòng:
# coins: ['XAUT', 'BTC', 'ETH', 'SOL']

# Sửa thành:
# coins: ['BTC', 'ETH', 'SOL', 'XRP']

# Lưu file (Ctrl+S)
# Restart service
```

### 9.2. Thay đổi Timeframes
```javascript
// server/config.js
timeframes: ['1H', '4H', '1D']  // Thêm hoặc bớt timeframes
```

### 9.3. Thay đổi Strategy Parameters
```javascript
// server/signals-3a.js
const STRATEGY_CONFIG = {
  volMultiplier: 1.5,      // Volume threshold
  absorbBodyRatio: 0.35,   // Absorption detection
  aggrBodyRatio: 0.6,      // Aggression detection
  slMultiplier: 1.5        // Stop loss multiplier
};
```

### 9.4. Lưu thay đổi & Restart
```powershell
# Nếu dùng NSSM:
nssm restart 3ATrading

# Nếu dùng PM2:
pm2 restart 3ATrading

# Nếu chạy thủ công:
# Dừng (Ctrl+C) và chạy lại: npm start
```

---

## 🧪 BƯỚC 10: Test hệ thống

### 10.1. Test Web Dashboard
```
Truy cập: http://[IP_VPS]:3000
Kiểm tra:
- Các token cards hiển thị
- Real-time price update
- Chart load được
```

### 10.2. Test Telegram
```
1. Đợi vài phút để bot load data
2. Kiểm tra Telegram notifications có tới không
3. Kiểm tra format signal message
```

### 10.3. Test OKX Connection
```powershell
# Xem logs
# Tìm dòng:
# ✅ XAUT WebSocket connected (1H)
# ✅ BTC WebSocket connected (1H)
# v.v.
```

---

## 🛡️ BƯỚC 11: Security & Backup

### 11.1. Backup file quan trọng
```powershell
# Tạo backup folder
mkdir C:\3a-trading-bot\backups

# Copy file config
copy .env backups\.env.backup
copy server\config.js backups\config.js.backup
```

### 11.2. Bảo vệ file .env
```powershell
# Thay đổi permissions (chỉ Admin có thể đọc)
icacls C:\3a-trading-bot\.env /grant:r "%username%:F" /inheritance:r
```

### 11.3. Enable Windows Firewall
```powershell
# Bật Firewall lại
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled $true

# Cho phép port 3000
New-NetFirewallRule -DisplayName "Allow Port 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000

# Cho phép HTTPS
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443
```

---

## 📋 Checklist Deploy

- [ ] VPS Windows chuẩn bị xong
- [ ] Node.js cài đặt và test
- [ ] Code upload lên VPS
- [ ] npm install chạy thành công
- [ ] .env file tạo với token/chat ID
- [ ] Bot chạy test thủ công: `npm start`
- [ ] Windows Service tạo (NSSM/PM2)
- [ ] Service auto-start on reboot
- [ ] Telegram notification nhận được
- [ ] Web dashboard truy cập được
- [ ] Backup files quan trọng

---

## 🚨 Troubleshooting

### Bot không khởi động
```powershell
# Check Node.js path
where node

# Check file exists
Test-Path C:\3a-trading-bot\server.js

# Check port 3000
netstat -ano | findstr :3000

# Check dependencies
cd C:\3a-trading-bot
npm list
```

### Telegram không nhận notification
```powershell
# Check .env file
cat .env

# Verify bot token
curl "https://api.telegram.org/bot[BOT_TOKEN]/getMe"

# Verify chat ID
curl "https://api.telegram.org/bot[BOT_TOKEN]/getUpdates"
```

### WebSocket error
```
1. Check internet connection
2. Check firewall cho phép outbound connections
3. Check OKX API status: https://status.okx.com/
```

### CPU/Memory quá cao
```powershell
# Check process
Get-Process node | Select-Object -Property ProcessName,Handles,CPU,Memory

# Nếu quá cao, restart service:
nssm restart 3ATrading
```

---

## 📞 Support

Nếu gặp vấn đề:
1. Check PowerShell logs
2. Check Event Viewer (eventvwr.msc)
3. Test từng component riêng
4. Tham khảo OKX API docs: https://www.okx.com/docs-v5/

---

## 🎉 Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Bot chạy 24/7 trên Windows VPS
- ✅ Theo dõi 4 tokens, 2 timeframes
- ✅ Tự động gửi signals về Telegram
- ✅ Web dashboard truy cập được
- ✅ Không cần máy tính cá nhân bật
- ✅ Có thể monitor từ bất kỳ device nào

**Chúc bạn deploy thành công! 🚀**

---

## 🔗 Useful Links

- Node.js: https://nodejs.org/
- NSSM: https://nssm.cc/
- PM2: https://pm2.keymetrics.io/
- Telegram BotFather: https://t.me/BotFather
- OKX API Docs: https://www.okx.com/docs-v5/
- Windows Remote Desktop: mstsc.exe
