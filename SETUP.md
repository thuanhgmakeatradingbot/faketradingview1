# 🎯 Setup - 3A Strategy Monitor

## 📊 Cấu hình hiện tại

### Tokens theo dõi (4):
- **XAUT** (Tether Gold)
- **BTC** (Bitcoin)
- **ETH** (Ethereum)
- **SOL** (Solana)

### Timeframes (2):
- **1H** (1 Hour)
- **4H** (4 Hours)

### Tổng monitors: **8** (4 tokens × 2 timeframes)

---

## 🚀 Chạy hệ thống

### Backend (24/7 monitoring):
```bash
node server.js
```

Sẽ khởi động 8 monitors:
- XAUT-USDT 1H
- XAUT-USDT 4H
- BTC-USDT 1H
- BTC-USDT 4H
- ETH-USDT 1H
- ETH-USDT 4H
- SOL-USDT 1H
- SOL-USDT 4H

### Web Interface:
```bash
# Mở index.html trong browser
# Hoặc:
npx http-server -p 8080
```

---

## 📱 Telegram Setup

1. Bot Token: `8083818214:AAFAjnasVGfLC2vXOGruJBuKl3Yx26DmEn8`
2. Chat ID: `-1002799528264`

Đã được config sẵn trong `server.js` và `index.html`

---

## ⚙️ Strategy Settings

### Simple Mode (Đang bật):
- Volume > 1.5x average
- Body ratio > 60%
- Price vs EMA20
- Risk: 1-5%

### Đổi sang Full 3A Mode:
Edit `config.js`:
```javascript
simpleMode: false
```

---

## 📈 Kết quả mong đợi

### Với 8 monitors:
- **H1**: Nhiều signals hơn (mỗi giờ check 1 lần)
- **H4**: Ít signals hơn nhưng chất lượng cao hơn

### Ước tính signals/ngày:
- Simple Mode: 2-5 signals/token/timeframe
- Full 3A Mode: 0-2 signals/token/timeframe

---

## 🔧 Thay đổi tokens/timeframes

### Thêm/bớt tokens:
Edit 3 files:
1. `server.js` - line 17
2. `config.js` - line 33
3. `chart-3a.js` - line 3

```javascript
coins: ['XAUT', 'BTC', 'ETH', 'SOL', 'YOUR_TOKEN']
```

### Thêm/bớt timeframes:
```javascript
timeframes: ['1H', '4H', '1D']
```

**Lưu ý**: OKX timeframe format:
- 1m, 5m, 15m, 30m
- 1H, 2H, 4H, 6H, 12H
- 1D, 1W, 1M

---

## 📊 Hiểu signals

```
🚀 BUY SIGNAL - 3A STRATEGY

📊 BTC-USDT (1H)
💰 Entry: $45,230.50

🎯 Targets:
🛡️ SL: $44,850.20 (1.85%)
💎 TP: $45,610.80

📋 Pattern: Simple 3A
🔄 Phase: Accumulation
```

### Ý nghĩa:
- **Entry**: Giá vào lệnh
- **SL**: Stop Loss (1.85% risk)
- **TP**: Take Profit (1:1 RR)
- **Phase**: Giai đoạn hiện tại

---

## 🎨 Web Interface

### Token Cards hiển thị:
- Real-time price
- Current phase (Absorption/Accumulation/Waiting)
- Volume
- 24h change
- Signal count

### Signal History:
- 20 signals gần nhất
- Entry, SL, TP details
- Pattern & Phase info

---

## 💡 Tips

1. **XAUT** (Gold token):
   - Ít biến động hơn crypto
   - Signals ít hơn nhưng ổn định
   - Phù hợp cho risk thấp

2. **BTC, ETH, SOL**:
   - Biến động cao hơn
   - Nhiều signals hơn
   - Phù hợp cho active trading

3. **H1 vs H4**:
   - H1: Scalping, day trading
   - H4: Swing trading, position trading

4. **Kết hợp timeframes**:
   - H4 cho trend chính
   - H1 cho entry timing

---

## 🛡️ Risk Management

- Mỗi signal có SL 1-5%
- RR ratio 1:1 (có thể tăng lên 2:1 hoặc 3:1)
- Không trade nếu risk quá cao
- Diversify: Không all-in 1 token

---

## 📞 Support

Có vấn đề? Check:
1. Console logs trong browser (F12)
2. Terminal output của `node server.js`
3. Telegram bot có hoạt động không

---

**Ready to trade! 🚀**
