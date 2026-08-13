# 3A Strategy Trading System

A real-time cryptocurrency trading signal detection system using the 3A Strategy (Absorption → Accumulation → Aggression).

## Project Structure

```
3a-trading-system/
├── client/                    # Frontend application
│   ├── index.html           # Main dashboard
│   ├── chart-3a.js          # Chart manager & UI logic
│   ├── signals-3a.js         # Signal detection algorithm
│   └── services/              # Client-side services
│       ├── candle-aggregator.js      # Timeframe aggregation
│       └── okx-client-browser.js    # OKX WebSocket/REST client
│
├── server/                    # Backend application
│   ├── server.js              # Entry point & cron jobs
│   ├── config.js              # Configuration settings
│   └── services/              # Server-side services
│       ├── coin-monitor.js        # Token monitoring logic
│       ├── okx-client.js         # OKX WebSocket/REST client (Node.js)
│       ├── signal-detector.js     # 3A Strategy detection
│       └── telegram.js           # Telegram notifications
│
├── package.json                # Dependencies & scripts
└── README.md                  # This file
```

## Quick Start

### Start Server Only (Backend)
```bash
npm start
```

### Start Client & Server Together (Recommended)
```bash
npm run start:all
```
This will:
- Run Node.js server (WebSocket monitoring + Telegram)
- Serve client dashboard on port 3000
- Open http://localhost:3000 in browser

## Features

- **Real-time WebSocket Data**: 1M candle data from OKX via WebSocket
- **Multi-Timeframe Support**: Aggregates 1M candles to 1H, 4H timeframes
- **3A Strategy Detection**: Absorption → Accumulation → Aggression pattern recognition
- **Auto-Start**: Client starts monitoring automatically on page load
- **Telegram Notifications**: Instant alerts when signals are detected
- **Responsive Charts**: Lightweight Charts for candle visualization

## Configuration

Edit `server/config.js` to configure:
- Tokens to monitor (default: BTC, ETH, SOL)
- Timeframes (default: 1H, 4H)
- Strategy parameters (volatility, volume, risk management)
- Telegram bot settings

## Environment Variables

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

## Dependencies

- **okx-api**: Official OKX WebSocket/REST API SDK
- **node-cron**: Scheduled data refresh
- **ws**: WebSocket implementation
- **concurrently**: Run multiple npm scripts together

## Development

```bash
npm run dev    # Server with nodemon (auto-restart)
```

## Deployment

See `DEPLOY.md` for deployment instructions.
