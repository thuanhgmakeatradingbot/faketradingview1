# 📱 Telegram Setup - Chi tiết từng bước

## 🎯 Mục tiêu
Nhận trading signals từ bot trực tiếp trên Telegram khi có signal, không cần mở browser.

---

## PHẦN 1: Tạo Telegram Bot

### Bước 1.1: Mở Telegram & Tìm BotFather

**Trên điện thoại:**
1. Mở Telegram App
2. Tìm kiếm: `@BotFather` (hoặc vào: t.me/BotFather)
3. Click "Start"

**Trên Desktop:**
1. Vào: https://web.telegram.org (hoặc app Telegram)
2. Tìm kiếm: `@BotFather`
3. Click chat

![BotFather Screenshot]
Bạn sẽ thấy BotFather bot với các lệnh

### Bước 1.2: Tạo Bot Mới

**Gửi command:**
```
/newbot
```

**BotFather sẽ hỏi:**

```
🤖 Alright, a new bot. How are we going to call it? 
Please choose a name for your bot.
```

**Trả lời:** Đặt tên bot
```
3A Trading Bot
```

**BotFather hỏi tiếp:**
```
Good. Now let's choose a username for your bot. 
It must end in `bot`. For example, TetrisBot or tetris_bot.
```

**Trả lời:** Đặt username (phải kết thúc bằng "bot")
```
my3a_trading_bot
```

Hoặc:
```
trading3a_bot
```

**BotFather sẽ trả:**
```
Done! Congratulations on your new bot. You will find it at t.me/my3a_trading_bot. 
You can now add a description, about section and commands for your bot. 
The following commands are available:

/setname – set bot name
/setdescription – set bot description
/setabouttext – set bot about text
/setcommands – change list of commands
/setdefaultcommands – change default bot commands

For a description of the bot's supported commands, 
see the Bot API documentation at https://core.telegram.org/bots/api

Keep your token secure and store it safely!

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyzABCdefGHIjkl

For a description of the Bot API, see this page:
https://core.telegram.org/bots/api
```

### ⭐ **LƯU LẠI TOKEN:**
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyzABCdefGHIjkl
```

❌ **KHÔNG CHIA SẺ TOKEN NÀY CHO AI!** (Nó giống như password)

---

## PHẦN 2: Lấy Chat ID

### Cách A: Từ @userinfobot (Đơn giản nhất ✅ KHUYẾN NGHỊ)

#### Bước 2A.1: Tìm @userinfobot
1. Tìm kiếm: `@userinfobot`
2. Click "Start"

#### Bước 2A.2: Bot sẽ gửi thông tin
Bot sẽ tự động gửi cho bạn:
```
You, [Your Name]
ID: 123456789
```

Hoặc click nó sẽ hiện:
```json
{
  "ok": true,
  "result": {
    "message_id": 12345,
    "sender_chat": {
      "id": 123456789,
      "is_bot": false,
      "first_name": "Your Name",
      "type": "private"
    },
    ...
  }
}
```

### ⭐ **LƯU LẠI CHAT ID:**
```
123456789
```

---

### Cách B: Từ Group (Nếu muốn theo dõi trong group)

#### Bước 2B.1: Tạo Group Telegram
1. Click "New Message" (hoặc "+" button)
2. Click "New Group"
3. Chọn members: Chỉ chọn chính bạn
4. Đặt tên: `3A Trading Signals`
5. Create

#### Bước 2B.2: Add Bot vào Group
1. Vào group vừa tạo
2. Click "Add Members"
3. Tìm bot: `my3a_trading_bot`
4. Add

#### Bước 2B.3: Gửi tin nhắn
1. Gửi message bất kỳ trong group (ví dụ: "test")

#### Bước 2B.4: Lấy Chat ID
1. Mở browser
2. Truy cập:
```
https://api.telegram.org/bot1234567890:ABCdefGHIjklMNOpqrsTUVwxyzABCdefGHIjkl/getUpdates
```

(Thay `1234567890:ABCdefGHIjklMNOpqrsTUVwxyzABCdefGHIjkl` bằng token của bạn)

3. Tìm dòng:
```json
{
  "ok": true,
  "result": [
    {
      "update_id": 987654321,
      "message": {
        "message_id": 2,
        "date": 1234567890,
        "chat": {
          "id": -1002799528264,
          "title": "3A Trading Signals",
          "type": "supergroup"
        },
        ...
      }
    }
  ]
}
```

### ⭐ **LƯU LẠI CHAT ID (GROUP):**
```
-1002799528264
```

**Lưu ý:** Group chat ID thường bắt đầu với `-100`

---

## PHẦN 3: Cấu hình trong VPS

### Bước 3.1: Mở file .env
```powershell
# Trên VPS (PowerShell)
notepad C:\3a-trading-bot\.env
```

### Bước 3.2: Thêm credentials

**Nếu chưa có .env:**
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyzABCdefGHIjkl
TELEGRAM_CHAT_ID=123456789
```

**Nếu đã có .env, cập nhật:**
Tìm dòng:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

Sửa thành:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyzABCdefGHIjkl
TELEGRAM_CHAT_ID=123456789
```

### Bước 3.3: Lưu file
```
Ctrl+S (hoặc File > Save)
```

### Bước 3.4: Restart bot
```powershell
# Nếu dùng NSSM:
nssm stop 3ATrading
nssm start 3ATrading

# Nếu dùng PM2:
pm2 restart 3ATrading

# Nếu chạy thủ công:
# Ctrl+C để dừng
# npm start để chạy lại
```

---

## PHẦN 4: Test Telegram

### Bước 4.1: Mở Telegram & Bot
1. Mở Telegram
2. Tìm bot: `my3a_trading_bot`
3. Click "Start" để open chat

### Bước 4.2: Đợi Signal
Bot sẽ tự động gửi signal khi phát hiện. Format:

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

### Bước 4.3: Xác nhận hoạt động

**Nếu nhận signal:** ✅ Perfect! Bot hoạt động tốt

**Nếu không nhận signal:**
1. Đợi thêm - signals không phải lúc nào cũng có
2. Check logs: `nssm query 3ATrading` hoặc `pm2 logs 3ATrading`
3. Xác nhận credentials trong .env

---

## 🔧 PHẦN 5: Troubleshooting Telegram

### Vấn đề: Bot không gửi Telegram

**Check 1: Credentials đúng?**
```powershell
# Mở .env
type .env

# Verify token format: 1234567890:ABC...
# Verify chat ID là số (hoặc -100xxx cho group)
```

**Check 2: Bot token có hợp lệ?**
```powershell
# Test token
curl -i "https://api.telegram.org/bot[YOUR_TOKEN]/getMe"

# Nếu thành công, sẽ thấy:
# "ok":true
# "result":{"id":1234567890,"is_bot":true,...}
```

**Check 3: Chat ID đúng?**
```powershell
# Xem updates
curl -i "https://api.telegram.org/bot[YOUR_TOKEN]/getUpdates"

# Tìm "chat":{"id":YOUR_CHAT_ID}
```

**Check 4: Bot được add vào group?**
```
1. Vào group
2. Click menu (3 dots)
3. Xem members
4. Có bot không?
```

**Check 5: Logs có error?**
```powershell
# NSSM logs
Get-Content "C:\Program Files\nssm\3ATrading\out.log" -Tail 50

# Tìm "Telegram"
# Nếu có error: "Permission denied", bot chưa được add vào group
```

---

### Vấn đề: Nhận tin nhắn 2 lần

**Nguyên nhân:** Bot restart hoặc config trùng

**Cách fix:**
1. Đảm bảo chỉ 1 instance bot chạy
2. Check: `Get-Process node | Measure-Object`
3. Restart bot một lần
4. Check logs

---

### Vấn đề: Telegram lag hoặc muộn

**Nguyên nhân:** Network hoặc Telegram API chậm

**Cách fix:**
1. Check internet: `ping 8.8.8.8`
2. Check Telegram status: https://status.telegram.org/
3. Increase retry attempts trong code
4. Không cần làm gì, Telegram API có thể bị delay đôi khi

---

## 📞 PHẦN 6: Advanced Setup

### Gửi signal đến nhiều chats

**Cách:** Tạo 2 bot hoặc gửi đến 2 group

```powershell
# .env
TELEGRAM_BOT_TOKEN=token1
TELEGRAM_CHAT_ID_1=123456789
TELEGRAM_CHAT_ID_2=-1002799528264

# Trong code (server/telegram.js):
await sendToChat(chatId1, message);
await sendToChat(chatId2, message);
```

---

### Tùy chỉnh message format

Edit `server/services/telegram.js`:

```javascript
const message = `
🚀 BUY SIGNAL - 3A STRATEGY

📊 ${symbol} (${timeframe})
💰 Entry: $${entry.toFixed(2)}

🎯 Targets:
🛡️ SL: $${sl.toFixed(2)} (${riskPercent}%)
💎 TP: $${tp.toFixed(2)}

📋 Pattern: ${pattern}
🔄 Phase: ${phase}

#3AStrategy #${coin}
`;
```

---

### Notifications chỉ cho certain tokens

```javascript
// server/services/telegram.js
const allowedCoins = ['BTC', 'ETH'];

if (allowedCoins.includes(coin)) {
  // Send notification
}
```

---

## 🎯 Checklist

- [ ] Tạo bot với @BotFather
- [ ] Lưu Bot Token
- [ ] Lấy Chat ID từ @userinfobot hoặc group
- [ ] Cập nhật .env trên VPS
- [ ] Restart bot
- [ ] Test nhận signal trên Telegram
- [ ] Xác nhận message format đúng
- [ ] Add thêm chat IDs nếu cần (optional)

---

## 🎉 Kết quả

Sau khi setup xong, mỗi khi có signal:

1. **Bot phát hiện signal** (3A pattern)
2. **Gửi Telegram notification** (ngay tức khắc)
3. **Bạn nhận tin** trên điện thoại/desktop
4. **Bạn quyết định trade** dựa trên signal

---

## 🔐 Security Notes

⚠️ **KHÔNG CHIA SẺ:**
- Bot Token
- Chat ID (nếu private)
- .env file

🔒 **PROTECT .env:**
```powershell
# Chỉ Admin có thể đọc
icacls C:\3a-trading-bot\.env /grant:r "%username%:F" /inheritance:r
```

---

**Chúc bạn setup thành công! 🎊**

Nếu còn vấn đề, check:
- QUICK-REFERENCE-WINDOWS.md
- DEPLOY-WINDOWS-VPS.md
- Bot logs: `pm2 logs 3ATrading`
