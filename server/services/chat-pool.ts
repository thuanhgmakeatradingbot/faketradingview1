import { getDB } from './signal-db';

export interface ChatEntry {
  id: number;
  chat_id: string;
  name: string;
  thread_id: number | null;
  enabled: number; // 0 | 1
  created_at: number;
}

/** Create the chats table on startup. Call after initDB(). */
export function initChatPool(): void {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      name TEXT NOT NULL,
      thread_id INTEGER,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);
  // Deduplicate by (chat_id, thread_id) — same chat, different topics is allowed.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_dedup
    ON chats(chat_id, IFNULL(thread_id, -1))
  `);
}

/**
 * Seed the pool with the legacy env chat on first launch, so existing users
 * don't lose their subscription after migrating. No-op if the pool already
 * has any rows (user has taken over management via the UI).
 */
export function seedIfEmpty(chatId: string, threadId?: number): void {
  const db = getDB();
  const row = db.prepare('SELECT COUNT(*) as c FROM chats').get() as { c: number };
  if (row.c > 0) return;
  if (!chatId) return;
  addChat(chatId, 'Default (from env)', threadId);
}

export function listChats(): ChatEntry[] {
  return getDB().prepare('SELECT * FROM chats ORDER BY id ASC').all() as ChatEntry[];
}

export function listEnabledChats(): ChatEntry[] {
  return getDB().prepare('SELECT * FROM chats WHERE enabled = 1 ORDER BY id ASC').all() as ChatEntry[];
}

export function addChat(chatId: string, name: string, threadId?: number): ChatEntry | null {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO chats (chat_id, name, thread_id, enabled, created_at)
    VALUES (@chat_id, @name, @thread_id, 1, @created_at)
  `);
  const res = stmt.run({
    chat_id: chatId,
    name,
    thread_id: threadId ?? null,
    created_at: Date.now(),
  });
  if (res.changes === 0) return null; // duplicate
  return db.prepare('SELECT * FROM chats WHERE id = ?').get(res.lastInsertRowid) as ChatEntry;
}

export function deleteChat(id: number): boolean {
  const res = getDB().prepare('DELETE FROM chats WHERE id = ?').run(id);
  return res.changes > 0;
}

export interface UpdateChatFields {
  name?: string;
  thread_id?: number | null;
}

/**
 * Update a chat's name and/or topic (thread) id. Returns the updated row, or
 * throws 'DUPLICATE' if the new (chat_id, thread_id) collides with another chat.
 */
export function updateChat(id: number, fields: UpdateChatFields): ChatEntry | null {
  const db = getDB();
  const current = getChat(id);
  if (!current) return null;

  const name = fields.name !== undefined ? fields.name : current.name;
  const threadId = fields.thread_id !== undefined ? fields.thread_id : current.thread_id;

  // Guard the unique (chat_id, IFNULL(thread_id,-1)) index before writing.
  const clash = db.prepare(`
    SELECT id FROM chats
    WHERE chat_id = ? AND IFNULL(thread_id, -1) = IFNULL(?, -1) AND id != ?
  `).get(current.chat_id, threadId, id) as { id: number } | undefined;
  if (clash) throw new Error('DUPLICATE');

  db.prepare('UPDATE chats SET name = ?, thread_id = ? WHERE id = ?').run(name, threadId, id);
  return getChat(id);
}

export function toggleChat(id: number): ChatEntry | null {
  const db = getDB();
  db.prepare('UPDATE chats SET enabled = 1 - enabled WHERE id = ?').run(id);
  return db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as ChatEntry | null;
}

export function getChat(id: number): ChatEntry | null {
  return getDB().prepare('SELECT * FROM chats WHERE id = ?').get(id) as ChatEntry | null;
}
