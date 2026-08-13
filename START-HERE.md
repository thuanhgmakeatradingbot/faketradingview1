# 🎯 BẮT ĐẦU TẠI ĐÂY

## 📋 Checklist - Làm theo thứ tự

### ✅ Bước 1: Setup Telegram (5 phút)
👉 Đọc file: **[TELEGRAM-SETUP.md](TELEGRAM-SETUP.md)**

Bạn cần:
- Bot Token
- Chat ID

### ✅ Bước 2: Deploy lên Railway (10 phút)
👉 Đọc file: **[DEPLOY.md](DEPLOY.md)**

Các bước:
1. Push code lên GitHub
2. Deploy từ GitHub lên Railway
3. Thêm Environment Variables
4. Check logs

### ✅ Bước 3: Kiểm tra Bot hoạt động
- Xem logs trên Railway
- Đợi nhận Telegram notification
- Enjoy! 🎉

---

## 🚀 Quick Start (Nếu đã biết)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/3a-bot.git
git push -u origin main

# 2. Deploy on Railway
# - Go to railway.app
# - New Project → Deploy from GitHub
# - Select your repo

# 3. Add Environment Variables on Railway
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id

# 4. Done! Check logs
```

---

## 📁 Files quan trọng

| File | Mô tả |
|------|-------|
| `server.js` | Backend bot (chạy 24/7) |
| `signals-3a.js` | 3A Strategy logic |
| `config.js` | Configuration |
| `TELEGRAM-SETUP.md` | Hướng dẫn setup Telegram |
| `DEPLOY.md` | Hướng dẫn deploy Railway |

---

## ⚙️ Cấu hình hiện tại

- **Tokens**: XAUT, BTC, ETH, SOL
- **Timeframes**: 1H, 4H
- **Total monitors**: 8
- **Data source**: OKX Perpetual Futures
- **Strategy**: 3A (Simple Mode)

---

## 🎯 Kết quả mong đợi

Sau khi setup:
- ✅ Bot chạy 24/7 trên Railway
- ✅ Tự động phát hiện signals
- ✅ Gửi về Telegram ngay lập tức
- ✅ Không cần máy tính bật

---

## 📞 Cần giúp đỡ?

1. Đọc **DEPLOY.md** - Hướng dẫn chi tiết
2. Đọc **TELEGRAM-SETUP.md** - Setup Telegram
3. Check logs trên Railway Dashboard
4. Xem phần Troubleshooting trong DEPLOY.md

---

**Chúc bạn thành công! 🚀**
