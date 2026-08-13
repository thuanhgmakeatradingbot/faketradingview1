import Database from 'better-sqlite3';
import path from 'path';

export interface DBSignal {
  id?: number;
  symbol: string;
  timeframe: string;
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  risk: number;
  pattern: string;
  phase: string;
  timestamp: number;
  detected_at: number;
  tp1_hit: number; // 0 or 1
  tp2_hit: number;
  tp3_hit: number;
  sl_hit: number;
  result: string; // 'tp1', 'tp2', 'tp3', 'sl', 'pending'
}

let db: Database.Database;

export function initDB(dbPath?: string): void {
  const resolvedPath = dbPath || path.resolve(process.cwd(), 'signals.db');
  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      type TEXT NOT NULL,
      entry REAL NOT NULL,
      sl REAL NOT NULL,
      tp REAL NOT NULL,
      risk REAL NOT NULL,
      pattern TEXT NOT NULL,
      phase TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      detected_at INTEGER DEFAULT 0,
      tp1_hit INTEGER DEFAULT 0,
      tp2_hit INTEGER DEFAULT 0,
      tp3_hit INTEGER DEFAULT 0,
      sl_hit INTEGER DEFAULT 0,
      result TEXT DEFAULT 'pending'
    )
  `);

  // Migration: add detected_at column if missing (existing DBs)
  const cols = db.prepare("PRAGMA table_info(signals)").all() as any[];
  if (!cols.some(c => c.name === 'detected_at')) {
    db.exec('ALTER TABLE signals ADD COLUMN detected_at INTEGER DEFAULT 0');
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_signals_symbol_tf ON signals(symbol, timeframe)
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_dedup ON signals(symbol, timeframe, type, timestamp)
  `);
}

export function saveSignal(signal: Omit<DBSignal, 'id' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'sl_hit' | 'result'>): boolean {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO signals (symbol, timeframe, type, entry, sl, tp, risk, pattern, phase, timestamp, detected_at)
    VALUES (@symbol, @timeframe, @type, @entry, @sl, @tp, @risk, @pattern, @phase, @timestamp, @detected_at)
  `);
  const result = stmt.run(signal);
  return result.changes > 0;
}

export function updateSignalResult(id: number, result: string, tp1Hit: boolean, tp2Hit: boolean, tp3Hit: boolean, slHit: boolean): void {
  const stmt = db.prepare(`
    UPDATE signals SET result = @result, tp1_hit = @tp1Hit, tp2_hit = @tp2Hit, tp3_hit = @tp3Hit, sl_hit = @slHit
    WHERE id = @id
  `);
  stmt.run({ id, result, tp1Hit: tp1Hit ? 1 : 0, tp2Hit: tp2Hit ? 1 : 0, tp3Hit: tp3Hit ? 1 : 0, slHit: slHit ? 1 : 0 });
}

export function loadSignals(symbol?: string, timeframe?: string): DBSignal[] {
  let query = 'SELECT * FROM signals WHERE 1=1';
  const params: any[] = [];
  if (symbol) { query += ' AND symbol = ?'; params.push(symbol); }
  if (timeframe) { query += ' AND timeframe = ?'; params.push(timeframe); }
  query += ' ORDER BY timestamp ASC';
  return db.prepare(query).all(...params) as DBSignal[];
}

export function getWinrateFromDB(symbol: string): { total: number; tp1Hit: number; tp2Hit: number; tp3Hit: number; slHit: number; pending: number } {
  const rows = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(tp1_hit) as tp1Hit,
      SUM(tp2_hit) as tp2Hit,
      SUM(tp3_hit) as tp3Hit,
      SUM(sl_hit) as slHit,
      SUM(CASE WHEN result = 'pending' THEN 1 ELSE 0 END) as pending
    FROM signals WHERE symbol = ?
  `).get(symbol) as any;

  return {
    total: rows.total || 0,
    tp1Hit: rows.tp1Hit || 0,
    tp2Hit: rows.tp2Hit || 0,
    tp3Hit: rows.tp3Hit || 0,
    slHit: rows.slHit || 0,
    pending: rows.pending || 0,
  };
}

export function getLatestSignals(limit: number = 10): DBSignal[] {
  return db.prepare('SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?').all(limit) as DBSignal[];
}

export function getDB(): Database.Database {
  return db;
}
