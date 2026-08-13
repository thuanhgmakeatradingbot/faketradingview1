# 📱 Hướng dẫn Setup Telegram - Siêu đơn giản

## Bước 1: Tạo Bot (2 phút)

1. Mở Telegram
2. Tìm: **@BotFather**
3. Gửi: `/newbot`
4. Đặt tên: `My 3A Trading Bot`
5. Đặt username: `my3a_bot` (phải unique)
6. **Copy Bot Token** (dạng: `123456:ABCdef...`)

## Bước 2: Lấy Chat ID (1 phút)

### Cách 1: Nhận signals riêng (Personal)
1. Tìm: **@userinfobot**
2. Start bot
3. **Copy Chat ID** (dạng: `123456789`)

### Cách 2: Nhận signals trong Group
1. Tạo group mới
2. Add bot vào group (tìm `@my3a_bot`)
3. Gửi tin nhắn: `/start`
4. Vào link: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
   (Thay `<BOT_TOKEN>` bằng token ở bước 1)
5. Tìm `"chat":{"id":-1001234567890}`
6. **Copy Chat ID** (dạng: `-1001234567890`)

## Bước 3: Cấu hình trên Railway (1 phút)

1. Vào Railway Dashboard
2. Click project của bạn
3. Tab **"Variables"**
4. Add 2 biến:

```
TELEGRAM_BOT_TOKEN = 123456:ABCdef... (từ bước 1)
TELEGRAM_CHAT_ID = 123456789 hoặc -1001234567890 (từ bước 2)
```

5. Click **"Add"**
6. Đợi Railway redeploy (30 giây)

## ✅ Xong!

Bot sẽ tự động gửi signals về Telegram khi phát hiện!

---

## 🧪 Test ngay

Không muốn đợi signal thật? Test thử:

1. Mở Telegram
2. Gửi tin nhắn cho bot: `/test`
3. Nếu bot reply → Setup thành công! ✅

---

## ❓ Troubleshooting

**Bot không gửi tin nhắn?**
- Check Bot Token đúng chưa
- Check Chat ID đúng chưa
- Nếu dùng group, check bot đã được add vào chưa

**Bot gửi nhưng không nhận được?**
- Check notification settings trên Telegram
- Check bot không bị block

**Vẫn không được?**
- Xem logs trên Railway
- Tìm dòng: `✅ Telegram message sent` hoặc `❌ Telegram error`

---

## 💡 Tips

- Dùng **Group** để nhiều người cùng nhận signals
- Dùng **Personal** để chỉ mình bạn nhận
- Có thể tạo nhiều bots cho nhiều strategies khác nhau

---

**Chúc bạn nhận được nhiều signals thành công! 🚀**
