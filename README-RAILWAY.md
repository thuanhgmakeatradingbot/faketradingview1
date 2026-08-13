# 🤖 3A Strategy Trading Bot

Automated crypto trading signal detection bot using 3A Strategy (Absorption → Accumulation → Aggression).

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

## ⚙️ Environment Variables

Set these in Railway Dashboard:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

## 📊 Features

- ✅ Monitors 4 tokens: XAUT, BTC, ETH, SOL
- ✅ 2 timeframes: 1H, 4H (8 monitors total)
- ✅ Perpetual Futures data from OKX
- ✅ Real-time Telegram notifications
- ✅ 24/7 automated monitoring

## 📖 Full Documentation

See [DEPLOY.md](DEPLOY.md) for detailed setup instructions.

## 🎯 Signal Format

```
🚀 BUY SIGNAL - 3A STRATEGY

📊 BTC-USDT-SWAP (1H)
💰 Entry: $75,230.50

🎯 Targets:
🛡️ SL: $74,850.20 (1.85%)
💎 TP: $75,610.80

📋 Pattern: Simple 3A
🔄 Phase: Accumulation
```

## 📝 License

MIT
