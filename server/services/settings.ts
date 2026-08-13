import { getDB } from './signal-db';

/**
 * Simple key-value settings store in SQLite. Used for runtime-editable config
 * (e.g. the Telegram bot token) that we don't want to hardcode or require an
 * env change + restart to update.
 */
export function initSettings(): void {
  getDB().exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

export function getSetting(key: string): string | null {
  const row = getDB().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  getDB()
    .prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
    .run(key, value, Date.now());
}

/** Mask a bot token for display: keep the numeric id prefix and last 4 chars. */
export function maskToken(token: string): string {
  if (!token) return '';
  const colon = token.indexOf(':');
  const prefix = colon > 0 ? token.slice(0, colon + 1) : '';
  const tail = token.slice(-4);
  return `${prefix}••••••••${tail}`;
}
