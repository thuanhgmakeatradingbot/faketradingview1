import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import CONFIG from './config';
import CoinMonitor from './services/coin-monitor';
import { sendMessage } from './services/telegram';
import { initDB, getLatestSignals } from './services/signal-db';
import {
  initChatPool, seedIfEmpty, listChats, listEnabledChats,
  addChat, deleteChat, toggleChat, getChat,
} from './services/chat-pool';
import { initSettings, getSetting, setSetting, maskToken } from './services/settings';
import { Signal } from '../shared/types';
import { formatTimeLog, getTimeframeDurationMs } from '../shared/time';
import { WinrateStats } from './services/coin-monitor';

interface SignalRecord extends Signal {
  symbol: string;
  timeframe: string;
  detectedAt: number;
}

let totalSignalsDetected = 0;
let refreshCount = 0;
let isStartupPhase = true;
let monitors: CoinMonitor[] = [];

// Active bot token — loaded from DB at startup (falls back to env/config),
// editable at runtime via the admin panel without a restart.
let activeBotToken = CONFIG.telegram.botToken;

function formatSignalForTelegram(signal: SignalRecord): string {
  const isBuy = signal.type === 'BUY';
  const directionIcon = isBuy ? '🟢' : '🔴';
  const directionText = isBuy ? 'BUY' : 'SELL';
  const symbolClean = signal.symbol.replace('-USDT-SWAP', '') + 'USDT';

  const entry = signal.entry;
  const sl = signal.sl;
  const tp1 = signal.tp;
  const extra = CONFIG.strategy.extraTpDistance ?? 500;
  const dir = isBuy ? 1 : -1;
  const tp2 = tp1 + dir * extra;
  const tp3 = tp2 + dir * extra;

  let message = `📌 PHƯỚC BÁU SIGNAL\n━━━━━━━━━━━\n\n`;
  message += `${directionIcon} ${directionText} ${symbolClean}\n`;
  message += `📍 Entry: ${entry.toFixed(2)}\n`;
  message += `🛑 SL: ${sl.toFixed(2)}\n`;
  message += `🎯 TP:\n`;
  message += `       TP 1: ${tp1.toFixed(2)}\n`;
  message += `       TP 2: ${tp2.toFixed(2)}\n`;
  message += `       TP 3: ${tp3.toFixed(2)}\n\n`;
  message += `💰 Vốn: max 2%/ lệnh\n\n`;
  message += `🔖 PB Research – AI phân tích, không phải lời khuyên đầu tư.`;

  return message;
}

/** Fan out one message to every enabled chat in the pool. */
async function broadcast(text: string): Promise<void> {
  const chats = listEnabledChats();
  if (chats.length === 0) {
    console.log(`[${formatTimeLog()}] [BROADCAST] No enabled chats in pool — skipping`);
    return;
  }
  for (const c of chats) {
    await sendMessage(text, activeBotToken, c.chat_id, c.thread_id ?? undefined);
  }
}

async function handleSignalDetected(signal: SignalRecord): Promise<void> {
  totalSignalsDetected++;

  console.log(`[${formatTimeLog()}] [SIGNAL #${totalSignalsDetected}] ${signal.type} ${signal.symbol} ${signal.timeframe} @ $${signal.entry.toFixed(2)}`);

  if (isStartupPhase) return;

  // Don't send stale signals to Telegram — the candle must have closed within
  // 1 candle-period ago. Still saved to DB for winrate history upstream.
  const candleCloseTime = signal.timestamp + getTimeframeDurationMs(signal.timeframe);
  const stalenessMs = Date.now() - candleCloseTime;
  const maxStalenessMs = getTimeframeDurationMs(signal.timeframe);
  if (stalenessMs > maxStalenessMs) {
    const staleMin = Math.round(stalenessMs / 60000);
    console.log(`[${formatTimeLog()}] [SKIP STALE] ${signal.symbol} ${signal.timeframe} ${signal.type} — ${staleMin}min old, saved to DB only`);
    return;
  }

  await broadcast(formatSignalForTelegram(signal));
}

// ────────────────────────────────────────────────────────────────────────────
// HTTP helpers — auth + JSON body
// ────────────────────────────────────────────────────────────────────────────

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'phuocbau2026';

function checkBasicAuth(req: http.IncomingMessage): boolean {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return false;
    return decoded.slice(0, idx) === ADMIN_USER && decoded.slice(idx + 1) === ADMIN_PASS;
  } catch { return false; }
}

function requireAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (checkBasicAuth(req)) return true;
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Phuoc Bau Admin"' });
  res.end('Unauthorized');
  return false;
}

function sendJSON(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ────────────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`[START BOT] [${formatTimeLog()}] PHUOC BAU BTC H4 Bot Starting...`);
  console.log(`[${formatTimeLog()}] [INIT] Initializing SQLite database...`);
  initDB();
  initChatPool();
  initSettings();
  // First run: seed the pool with the env chat so signals go somewhere out of the box.
  seedIfEmpty(CONFIG.telegram.chatId, CONFIG.telegram.threadId);

  // Load the bot token from DB if the admin has set one; otherwise keep env/config.
  const savedToken = getSetting('bot_token');
  if (savedToken) {
    activeBotToken = savedToken;
    console.log(`[${formatTimeLog()}] [INIT] Bot token loaded from DB: ${maskToken(activeBotToken)}`);
  } else {
    console.log(`[${formatTimeLog()}] [INIT] Bot token from env/config: ${maskToken(activeBotToken)}`);
  }

  console.log(`[${formatTimeLog()}] [INIT] Chat pool: ${listChats().length} chats total, ${listEnabledChats().length} enabled`);
  console.log(`[${formatTimeLog()}] [INIT] Creating monitors for: ${CONFIG.tokens.join(', ')}`);

  CONFIG.tokens.forEach(coin => {
    const monitor = new CoinMonitor(coin, CONFIG, handleSignalDetected);
    monitors.push(monitor);
    console.log(`[${formatTimeLog()}] [INIT] Monitor for ${coin} created`);
  });

  for (let i = 0; i < monitors.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      await monitors[i].start();
    } catch (err: any) {
      console.error(`[${formatTimeLog()}] [INIT ERROR] ${monitors[i].symbol}: ${err.message} — skipping startup scan, cron will retry`);
    }
  }

  isStartupPhase = false;

  cron.schedule('1 0 * * * *', async () => {
    const utcHour = new Date().getUTCHours();
    if (utcHour % 4 !== 0) return;
    const timeframesToScan = ['4H'];

    console.log(`[${refreshCount}] [${formatTimeLog()}] 4H candle closed — scanning ${timeframesToScan.join(', ')}...`);

    let totalSaved = 0;
    for (const monitor of monitors) {
      try { await monitor.refreshData(); }
      catch (err: any) {
        console.error(`[${formatTimeLog()}] [REFRESH ERROR] ${monitor.symbol}: ${err.message} — skipping this tick`);
        continue;
      }
      const { newlySaved } = monitor.replayAllSignalsToDB(false, timeframesToScan);
      totalSaved += newlySaved.length;
      for (const sig of newlySaved) await handleSignalDetected(sig as SignalRecord);
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

  // Look for admin.html next to this source file first (ts-node) — fall back to
  // server/admin.html relative to the cwd (works when running from dist/).
  const ADMIN_HTML_PATH = fs.existsSync(path.resolve(__dirname, 'admin.html'))
    ? path.resolve(__dirname, 'admin.html')
    : path.resolve(process.cwd(), 'server/admin.html');
  const CLIENT_BUILD = path.resolve(__dirname, '../client/build');
  const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2',
  };

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    const method = req.method || 'GET';

    try {
      // Public: bot status (safe read, no secrets).
      if (url === '/api/status') {
        return sendJSON(res, 200, {
          status: 'running', tokens: CONFIG.tokens,
          monitors: monitors.length, signals: totalSignalsDetected,
        });
      }

      // Everything else under /admin and /api/* (except status) requires Basic Auth.
      const isAdminUI = url === '/admin' || url === '/admin/';
      const isChatsAPI = url.startsWith('/api/chats');
      const isSettingsAPI = url.startsWith('/api/settings');
      if (isAdminUI || isChatsAPI || isSettingsAPI) {
        if (!requireAuth(req, res)) return;
      }

      if (isAdminUI) {
        return fs.readFile(ADMIN_HTML_PATH, (err, data) => {
          if (err) { res.writeHead(500); return res.end('admin.html not found'); }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data);
        });
      }

      // Settings API — bot token
      if (url === '/api/settings' && method === 'GET') {
        return sendJSON(res, 200, {
          botToken: activeBotToken ? maskToken(activeBotToken) : '',
          hasToken: !!activeBotToken,
          source: getSetting('bot_token') ? 'db' : 'env',
        });
      }
      if (url === '/api/settings/token' && method === 'POST') {
        const body = await readBody(req);
        const token = String(body.token || '').trim();
        if (!token || !token.includes(':')) {
          return sendJSON(res, 400, { error: 'Token không hợp lệ (định dạng: 123456:ABC...)' });
        }
        setSetting('bot_token', token);
        activeBotToken = token;
        console.log(`[${formatTimeLog()}] [SETTINGS] Bot token updated via admin: ${maskToken(token)}`);
        return sendJSON(res, 200, { ok: true, botToken: maskToken(token) });
      }

      // Chat pool API
      if (url === '/api/chats' && method === 'GET') {
        return sendJSON(res, 200, listChats());
      }
      if (url === '/api/chats' && method === 'POST') {
        const body = await readBody(req);
        if (!body.chat_id || !body.name) return sendJSON(res, 400, { error: 'chat_id và name là bắt buộc' });
        const created = addChat(String(body.chat_id), String(body.name), body.thread_id ?? undefined);
        if (!created) return sendJSON(res, 409, { error: 'Chat đã tồn tại' });
        return sendJSON(res, 201, created);
      }
      const chatIdMatch = url.match(/^\/api\/chats\/(\d+)(\/toggle|\/test)?$/);
      if (chatIdMatch) {
        const id = parseInt(chatIdMatch[1], 10);
        const action = chatIdMatch[2];
        if (method === 'DELETE' && !action) {
          const ok = deleteChat(id);
          return sendJSON(res, ok ? 200 : 404, { ok });
        }
        if (method === 'POST' && action === '/toggle') {
          const updated = toggleChat(id);
          return sendJSON(res, updated ? 200 : 404, updated ?? { error: 'not found' });
        }
        if (method === 'POST' && action === '/test') {
          const c = getChat(id);
          if (!c) return sendJSON(res, 404, { ok: false, error: 'not found' });
          try {
            await sendMessage(
              `🧪 Test từ PHƯỚC BÁU Bot\n\nNếu bạn thấy tin này, chat "${c.name}" đã được cấu hình đúng ✅`,
              activeBotToken, c.chat_id, c.thread_id ?? undefined
            );
            return sendJSON(res, 200, { ok: true });
          } catch (e: any) {
            return sendJSON(res, 500, { ok: false, error: e.message });
          }
        }
      }

      // Fallback: serve React client build if present (unchanged).
      const filePath = path.join(CLIENT_BUILD, url === '/' ? 'index.html' : url);
      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(CLIENT_BUILD, 'index.html'), (e2, d2) => {
            if (e2) { res.writeHead(404); return res.end('Not found — try /admin'); }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(d2);
          });
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    } catch (err: any) {
      console.error(`[${formatTimeLog()}] [HTTP ERROR] ${method} ${url}: ${err.message}`);
      if (!res.headersSent) sendJSON(res, 500, { error: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[${formatTimeLog()}] Server listening on port ${PORT}`);
    console.log(`[${formatTimeLog()}] Admin UI: http://localhost:${PORT}/admin (user: ${ADMIN_USER})`);
  });

  async function shutdownHandler(signalName: string) {
    console.log(`[END BOT] [${formatTimeLog()}] Shutting down (${signalName})...`);
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
