# 🚀 Quick Start Guide - 3A Strategy

## 📦 Cài đặt nhanh

```bash
# 1. Cài dependencies
npm install

# 2. Chạy backend (24/7 monitoring)
node server.js

# 3. Mở web interface
# Mở file index.html trong browser
# Hoặc dùng HTTP server:
npx http-server -p 8080
```

## 🎯 Sử dụng Web Interface

1. **Mở `index.html`** trong browser
2. **Chọn timeframe** (1m, 5m, 15m, 1h, 4h, 1d)
3. **Click "Start Monitoring"**
4. Xem real-time charts cho 10 tokens
5. Signals sẽ hiện trong Signal History

## 📱 Setup Telegram (Optional)

1. Tạo bot với [@BotFather](https://t.me/BotFather)
2. Lấy Chat ID từ [@userinfobot](https://t.me/userinfobot)
3. Nhập vào web interface hoặc edit `config.js`
4. Click "Test Telegram" để kiểm tra

## ⚙️ Cấu hình

### Simple Mode (Mặc định)
- Chỉ cần: Volume cao + Body mạnh + Trend
- Nhiều signals hơn
- Phù hợp cho scalping

### Full 3A Mode
- Cần đủ 3 phase: Absorption → Accumulation → Aggression
- Ít signals hơn nhưng chất lượng cao
- Phù hợp cho swing trading

Đổi mode trong `config.js`:
```javascript
simpleMode: true  // Simple mode
simpleMode: false // Full 3A mode
```

## 📊 Tokens được theo dõi

- BTC, ETH, XRP, BNB, SOL
- DOGE, ADA, TRX, AVAX, SHIB

Thêm/bớt tokens trong `config.js`:
```javascript
tokens: ['BTC', 'ETH', 'YOUR_TOKEN']
```

## 🎨 Hiểu Phase Indicators

- **🟠 Absorption**: Volume cao, body nhỏ - Tổ chức đang hấp thụ
- **🔵 Accumulation**: Range hẹp - Đang tích lũy
- **⚪ Waiting**: Chờ điều kiện

## 📈 Đọc Signals

```
🚀 BUY SIGNAL
Entry: $45,230.50
SL: $44,850.20 (1.85%)  ← Risk
TP: $45,610.80          ← Target
```

- **Risk**: Luôn 1-5%
- **RR**: 1:1 (có thể config)
- **Pattern**: Simple 3A hoặc Full 3A

## 🛡️ Risk Management

- SL tự động dựa trên ATR
- Risk giới hạn 1-5%
- Không có signal nếu risk quá cao/thấp
- RR ratio 1:1 (có thể điều chỉnh)

## 🔧 Troubleshooting

**WebSocket không kết nối?**
- Check internet connection
- OKX có thể bị block ở một số quốc gia
- Thử VPN

**Không có signals?**
- Đợi thêm - signals không phải lúc nào cũng có
- Thử timeframe khác
- Check console logs

**Telegram không gửi?**
- Verify Bot Token và Chat ID
- Click "Test Telegram"
- Check bot đã được add vào group chưa

## 📝 Files quan trọng

- `server.js` - Backend monitoring
- `index.html` - Web interface
- `signals-3a.js` - 3A strategy logic
- `chart-3a.js` - Chart management
- `config.js` - Configuration

## 💡 Tips

1. **Timeframe cao hơn = signals chất lượng hơn**
   - 1m, 5m: Nhiều signals, nhiều noise
   - 1h, 4h: Ít signals, chất lượng cao
   - 1d: Rất ít signals, rất chất lượng

2. **Simple Mode vs Full 3A**
   - Mới bắt đầu: Dùng Simple Mode
   - Có kinh nghiệm: Thử Full 3A Mode

3. **Multi-timeframe**
   - Chạy cả backend (nhiều timeframes)
   - Web interface (1 timeframe)
   - Kết hợp để có overview tốt nhất

4. **Backtest trước khi trade thật**
   - Xem signals trong vài ngày
   - Đánh giá win rate
   - Điều chỉnh parameters nếu cần

## 🎓 Học thêm

- Đọc `README.md` để hiểu chi tiết
- Xem `new_logic` - Pine Script gốc
- Tham khảo OKX API docs

---

**Happy Trading! 🚀**
