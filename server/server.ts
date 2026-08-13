import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import CONFIG from './config';
import CoinMonitor from './services/coin-monitor';
import { sendMessage } from './services/telegram';
import { initDB, getLatestSignals } from './services/signal-db';
import { Signal } from '../shared/types';
import { formatTimeLog, formatTimeTelegram, getTimeframeDurationMs, now } from '../shared/time';
import { WinrateStats } from './services/coin-monitor';

interface SignalRecord extends Signal {
  symbol: string;
  timeframe: string;
  detectedAt: number;
}

let totalSignalsDetected = 0;
let refreshCount = 0;
let allSignals: SignalRecord[] = [];
let isStartupPhase = true;
let startupSignals: SignalRecord[] = [];
let monitors: CoinMonitor[] = [];

function getAggregatedWinrate(): WinrateStats {
  const agg: WinrateStats = { total: 0, tp1Hit: 0, tp2Hit: 0, tp3Hit: 0, slHit: 0, pending: 0 };
  for (const m of monitors) {
    agg.total += m.winrateStats.total;
    agg.tp1Hit += m.winrateStats.tp1Hit;
    agg.tp2Hit += m.winrateStats.tp2Hit;
    agg.tp3Hit += m.winrateStats.tp3Hit;
    agg.slHit += m.winrateStats.slHit;
    agg.pending += m.winrateStats.pending;
  }
  return agg;
}

function formatSignalForTelegram(signal: SignalRecord, stats: WinrateStats, coin: string): string {
  const direction = signal.type === 'BUY' ? '🟢 LONG' : '🔴 SHORT';
  const symbolClean = signal.symbol.replace('-SWAP', '').replace('-', '');
  const score = signal.score || 6;
  const starCount = Math.max(1, Math.round(score / 2));
  const stars = '⭐️'.repeat(starCount);
  const confidence = `${stars} ${score}/10`;

  const entry = signal.entry;
  const sl = signal.sl;
  const riskPercent = parseFloat(signal.risk) || Math.abs((entry - sl) / entry * 100);
  const rrRatio = CONFIG.strategy.rrRatio || 1.0;

  const tp1 = signal.tp;
  const distance = Math.abs(entry - tp1);
  const dir = signal.type === 'BUY' ? 1 : -1;
  const tp2 = entry + dir * 2 * distance;
  const tp3 = entry + dir * 3 * distance;
  const tp1Distance = (distance / entry) * 100;
  const tp2Distance = (Math.abs(entry - tp2) / entry) * 100;
  const tp3Distance = (Math.abs(entry - tp3) / entry) * 100;

  const candleCloseStr = formatTimeTelegram(signal.timestamp + getTimeframeDurationMs(signal.timeframe));

  const tp1Pct = stats.total > 0 ? ((stats.tp1Hit / stats.total) * 100).toFixed(0) : '0';
  const tp2Pct = stats.total > 0 ? ((stats.tp2Hit / stats.total) * 100).toFixed(0) : '0';
  const tp3Pct = stats.total > 0 ? ((stats.tp3Hit / stats.total) * 100).toFixed(0) : '0';
  const winrateLine = `TP1: ${tp1Pct}%🟡 | TP2: ${tp2Pct}%🔴 | TP3: ${tp3Pct}%🔴`;

  let message = `${direction} ${symbolClean} — ${confidence}\n\n`;
  message += `💰 Entry : ${entry.toFixed(2)}\n`;
  message += `🛑 SL    : ${sl.toFixed(2)} (${riskPercent.toFixed(2)}%)\n`;
  message += `🎯 TP1   : ${tp1.toFixed(2)} (${tp1Distance.toFixed(2)}%)\n`;
  message += `🎯 TP2   : ${tp2.toFixed(2)} (${tp2Distance.toFixed(2)}%)\n`;
  message += `🎯 TP3   : ${tp3.toFixed(2)} (${tp3Distance.toFixed(2)}%)\n\n`;
  message += `⏱️ Timeframe : ${signal.timeframe}\n`;
  message += `📐 R:R       : 1:${rrRatio.toFixed(1)}\n\n`;
  message += `─ Winrate Stats (${coin}) ─\n`;
  message += `${winrateLine}\n`;
  message += `Based on ${stats.total} signals\n\n`;
  message += `─ ─ ─\n`;

  // Late signal detection warning (delay measured from candle CLOSE, not open)
  const detectedAt = signal.detectedAt || signal.timestamp;
  const candleCloseTime = signal.timestamp + getTimeframeDurationMs(signal.timeframe);
  const delayMs = detectedAt - candleCloseTime;
  const delayMin = Math.round(delayMs / 60000);
  if (delayMin >= 5) {
    message += `⚠️ Late signal — detected ${delayMin}min after candle close\n`;
    message += `🕐 Candle Closed At: ${candleCloseStr} | Detected: ${formatTimeTelegram(detectedAt)}`;
  } else {
    message += `🕐 Candle Closed At: ${candleCloseStr}`;
  }

  return message;
}

function findMonitor(symbol: string): CoinMonitor | undefined {
  return monitors.find(m => m.symbol === symbol);
}

async function handleSignalDetected(signal: SignalRecord): Promise<void> {
  totalSignalsDetected++;
  allSignals.push(signal);

  console.log(`[${formatTimeLog()}] [SIGNAL #${totalSignalsDetected}] ${signal.type} ${signal.symbol} ${signal.timeframe} @ $${signal.entry.toFixed(2)}`);

  if (isStartupPhase) {
    startupSignals.push(signal);
    return;
  }

  // Don't send stale signals to Telegram — the candle must have closed
  // within 1 candle-period ago (e.g. ≤1h for 1H, ≤4h for 4H).
  // The signal is still saved to DB for winrate history.
  const candleCloseTime = signal.timestamp + getTimeframeDurationMs(signal.timeframe);
  const stalenessMs = Date.now() - candleCloseTime;
  const maxStalenessMs = getTimeframeDurationMs(signal.timeframe);
  if (stalenessMs > maxStalenessMs) {
    const staleMin = Math.round(stalenessMs / 60000);
    console.log(`[${formatTimeLog()}] [SKIP STALE] ${signal.symbol} ${signal.timeframe} ${signal.type} — ${staleMin}min old, saved to DB only`);
    return;
  }

  const mon = findMonitor(signal.symbol);
  const stats = mon ? mon.winrateStats : getAggregatedWinrate();
  const coin = mon ? mon.coin : signal.symbol.replace('-USDT-SWAP', '');
  const message = formatSignalForTelegram(signal, stats, coin);
  await sendMessage(message, CONFIG.telegram.botToken, CONFIG.telegram.chatId);
}

async function sendStartupSummary(): Promise<void> {
  // Pull the latest 6 signals from the DB, sorted by candle time desc.
  const latest = getLatestSignals(6);

  if (latest.length === 0) {
    await sendMessage('📋 Bot started — no signals in DB.', CONFIG.telegram.botToken, CONFIG.telegram.chatId);
    startupSignals = [];
    return;
  }

  // One short line per signal:  🟢 BTC 1H BUY 50000 [tp1] Closed: Apr 27, 2026 16:00
  const lines = latest.map(s => {
    const arrow = s.type === 'BUY' ? '🟢' : '🔴';
    const coin = s.symbol.replace('-USDT-SWAP', '');
    const closeStr = formatTimeTelegram(s.timestamp + getTimeframeDurationMs(s.timeframe));
    return `${arrow} ${coin} ${s.timeframe} ${s.type} ${s.entry.toFixed(2)} [${s.result}] Closed: ${closeStr}`;
  });
  const fullMessage = `📋 Bot started — latest ${latest.length}:\n${lines.join('\n')}`;

  await sendMessage(fullMessage, CONFIG.telegram.botToken, CONFIG.telegram.chatId);
  startupSignals = [];
}

(async () => {
  console.log(`[START BOT] [${formatTimeLog()}] 3A Strategy Trading System Starting...`);
  console.log(`[${formatTimeLog()}] [INIT] Initializing SQLite database...`);
  initDB();
  console.log(`[${formatTimeLog()}] [INIT] Creating monitors for: ${CONFIG.tokens.join(', ')}`);

  CONFIG.tokens.forEach(coin => {
    const monitor = new CoinMonitor(coin, CONFIG, handleSignalDetected);
    monitors.push(monitor);
    console.log(`[${formatTimeLog()}] [INIT] Monitor for ${coin} created`);
  });

  // Start monitors sequentially, collect their latest signals
  for (let i = 0; i < monitors.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const latest = await monitors[i].start();
      startupSignals.push(...latest);
    } catch (err: any) {
      console.error(`[${formatTimeLog()}] [INIT ERROR] ${monitors[i].symbol}: ${err.message} — skipping startup scan, cron will retry`);
    }
  }

  // All monitors done scanning — send the 3 latest signals to Telegram
  isStartupPhase = false;
  await sendStartupSummary();

  // Fire at HH:00:01 every hour — 1 second after the 1H candle closes.
  // 4H candles (UTC-aligned) close every 4 UTC hours; detect that via utcHour % 4 === 0.
  cron.schedule('1 0 * * * *', async () => {
    const utcHour = new Date().getUTCHours();
    const is4HClose = utcHour % 4 === 0;
    const timeframesToScan = is4HClose ? ['1H', '4H'] : ['1H'];

    console.log(`[${refreshCount}] [${formatTimeLog()}] Hourly refresh — scanning ${timeframesToScan.join(', ')}${is4HClose ? ' (4H candle closed)' : ''}...`);

    let totalSaved = 0;
    for (const monitor of monitors) {
      try {
        await monitor.refreshData();
      } catch (err: any) {
        console.error(`[${formatTimeLog()}] [REFRESH ERROR] ${monitor.symbol}: ${err.message} — skipping this tick`);
        continue;
      }
      const { newlySaved } = monitor.replayAllSignalsToDB(false, timeframesToScan);
      totalSaved += newlySaved.length;
      for (const sig of newlySaved) {
        await handleSignalDetected(sig as SignalRecord);
      }
    }

    console.log(`[${refreshCount}] [${formatTimeLog()}] Refresh completed (+${totalSaved} new signals to DB)`);

    const latest = getLatestSignals(6);
    if (latest.length > 0) {
      console.log(`[${formatTimeLog()}] [LATEST 6]`);
      latest.forEach((s, i) => {
        const arrow = s.type === 'BUY' ? '🟢' : '🔴';
        const coin = s.symbol.replace('-USDT-SWAP', '');
        console.log(
          `  ${i + 1}. ${arrow} ${coin} ${s.timeframe} ${s.type} ` +
          `E=${s.entry.toFixed(2)} SL=${s.sl.toFixed(2)} TP=${s.tp.toFixed(2)} ` +
          `[${s.result}] ${formatTimeLog(s.timestamp)}`
        );
      });
    }

    refreshCount++;
  });

  // HTTP server — serves client static files + /api/status
  const CLIENT_BUILD = path.resolve(__dirname, '../client/build');
  const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    if (req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'running',
        tokens: CONFIG.tokens,
        monitors: monitors.length,
        signals: totalSignalsDetected,
      }));
      return;
    }

    let filePath = path.join(CLIENT_BUILD, req.url === '/' ? 'index.html' : req.url!);
    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA fallback: serve index.html for client-side routes
        fs.readFile(path.join(CLIENT_BUILD, 'index.html'), (e2, d2) => {
          if (e2) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(d2);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[${formatTimeLog()}] Server listening on port ${PORT}`);
  });

  async function shutdownHandler(signalName: string) {
    console.log(`[END BOT] [${formatTimeLog()}] Shutting down...`);

    const endMessage = `🔴 3A Strategy Bot Stopped

📅 ${formatTimeLog()}

📊 Monitors: ${monitors.length}
📈 Signals detected: ${totalSignalsDetected}
⏱️ Last refresh: #${refreshCount}

🔄 Bot stopped by ${signalName} signal`;

    await sendMessage(endMessage, CONFIG.telegram.botToken, CONFIG.telegram.chatId);

    server.close();
    monitors.forEach(m => m.stop());
    process.exit(0);
  }

  process.on('SIGINT', () => shutdownHandler('SIGINT'));
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    console.error(error.stack);
    setTimeout(() => process.exit(1), 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
})();
