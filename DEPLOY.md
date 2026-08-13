# 🚀 Deploy to Railway - Hướng dẫn chi tiết

## 📋 Bước 1: Chuẩn bị Telegram Bot

### 1.1. Tạo Telegram Bot
1. Mở Telegram, tìm **@BotFather**
2. Gửi lệnh: `/newbot`
3. Đặt tên bot (VD: `3A Trading Bot`)
4. Đặt username (VD: `my3a_trading_bot`)
5. **Lưu lại Bot Token** (VD: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 1.2. Lấy Chat ID

**Cách 1: Dùng bot @userinfobot**
1. Tìm **@userinfobot** trên Telegram
2. Start bot
3. Bot sẽ gửi cho bạn **Chat ID** (VD: `123456789`)

**Cách 2: Tạo Group**
1. Tạo group mới trên Telegram
2. Add bot vào group
3. Gửi tin nhắn bất kỳ trong group
4. Truy cập: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
5. Tìm `"chat":{"id":-1001234567890}` → Đó là Chat ID

**Lưu ý:** Chat ID của group thường bắt đầu bằng `-100`

---

## 🚂 Bước 2: Deploy lên Railway

### 2.1. Tạo tài khoản Railway
1. Truy cập: https://railway.app
2. Sign up bằng GitHub (khuyến nghị)
3. Verify email

### 2.2. Deploy từ GitHub

**Option A: Deploy từ GitHub (Khuyến nghị)**

1. **Push code lên GitHub:**
```bash
git init
git add .
git commit -m "Initial commit - 3A Strategy Bot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/3a-trading-bot.git
git push -u origin main
```

2. **Trên Railway:**
   - Click **"New Project"**
   - Chọn **"Deploy from GitHub repo"**
   - Authorize Railway truy cập GitHub
   - Chọn repository `3a-trading-bot`
   - Railway sẽ tự động detect và deploy

**Option B: Deploy từ CLI**

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login:**
```bash
railway login
```

3. **Deploy:**
```bash
railway init
railway up
```

---

## ⚙️ Bước 3: Cấu hình Environment Variables

1. Trên Railway Dashboard, click vào project
2. Chọn tab **"Variables"**
3. Thêm 2 biến:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
```

4. Click **"Add"** cho mỗi biến
5. Railway sẽ tự động redeploy

---

## ✅ Bước 4: Kiểm tra Bot hoạt động

### 4.1. Xem Logs
1. Trên Railway Dashboard
2. Click tab **"Deployments"**
3. Click vào deployment mới nhất
4. Xem logs, tìm:
```
✅ Started 8 monitors (4 tokens × 2 timeframes)
📱 Telegram notifications: ENABLED
```

### 4.2. Test Telegram
- Đợi vài phút để bot load data
- Khi có signal, bot sẽ tự động gửi về Telegram
- Format message:
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

## 🔧 Bước 5: Tùy chỉnh (Optional)

### 5.1. Thay đổi Tokens
Edit `server.js` line 17:
```javascript
coins: ['BTC', 'ETH', 'SOL', 'YOUR_TOKEN']
```

### 5.2. Thay đổi Timeframes
Edit `server.js` line 18:
```javascript
timeframes: ['1H', '4H', '1D']
```

### 5.3. Thay đổi Strategy Parameters
Edit `signals-3a.js` line 11-28:
```javascript
volMultiplier: 1.5,      // Volume threshold
absorbBodyRatio: 0.35,   // Absorption detection
aggrBodyRatio: 0.6,      // Aggression detection
slMultiplier: 1.5,       // Stop loss multiplier
```

Sau khi edit, commit và push:
```bash
git add .
git commit -m "Update configuration"
git push
```

Railway sẽ tự động redeploy.

---

## 📊 Monitoring

### Railway Dashboard
- **Metrics**: CPU, Memory usage
- **Logs**: Real-time logs
- **Deployments**: Deployment history

### Telegram
- Nhận signals real-time
- Mỗi signal có đầy đủ thông tin: Entry, SL, TP, Risk%

---

## 🐛 Troubleshooting

### Bot không gửi Telegram?
1. Check Environment Variables đã đúng chưa
2. Check Bot Token có hợp lệ không
3. Check Chat ID có đúng không (group phải có `-100` prefix)
4. Check bot đã được add vào group chưa

### Bot bị crash?
1. Xem logs trên Railway
2. Check có lỗi WebSocket không
3. Railway có thể restart tự động

### Không có signals?
1. Đợi thêm - signals không phải lúc nào cũng có
2. Check logs xem bot đã load data chưa
3. Thử thay đổi parameters để có nhiều signals hơn

---

## 💰 Chi phí

**Railway Free Tier:**
- $5 credit/month
- Đủ để chạy bot 24/7
- Nếu hết credit, bot sẽ tạm dừng đến tháng sau

**Railway Pro:**
- $20/month
- Unlimited usage
- Priority support

---

## 📝 Checklist

- [ ] Tạo Telegram Bot với @BotFather
- [ ] Lấy Bot Token
- [ ] Lấy Chat ID (user hoặc group)
- [ ] Tạo tài khoản Railway
- [ ] Push code lên GitHub
- [ ] Deploy từ GitHub lên Railway
- [ ] Thêm Environment Variables
- [ ] Check logs trên Railway
- [ ] Test nhận Telegram notification
- [ ] Customize tokens/timeframes (optional)

---

## 🎯 Kết quả mong đợi

Sau khi setup xong:
- ✅ Bot chạy 24/7 trên Railway
- ✅ Theo dõi 4 tokens (XAUT, BTC, ETH, SOL)
- ✅ 2 timeframes (1H, 4H) = 8 monitors
- ✅ Tự động gửi signals về Telegram
- ✅ Không cần máy tính bật

---

**Chúc bạn trade thành công! 🚀**
