import initSqlJs, { type Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { paths, ensureDir } from './config.js'

let db: Database | null = null

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()
  ensureDir()

  if (existsSync(paths.db)) {
    const buffer = readFileSync(paths.db)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  initSchema(db)
  return db
}

export function saveDb() {
  if (db) {
    const data = db.export()
    writeFileSync(paths.db, Buffer.from(data))
  }
}

export function closeDb() {
  if (db) {
    saveDb()
    db.close()
    db = null
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      json_payload TEXT,
      agent TEXT,
      project TEXT,
      labels TEXT DEFAULT '[]',
      channel_id TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      source TEXT NOT NULL DEFAULT 'nmp',
      thread_id TEXT,
      in_reply_to TEXT,
      has_attachments INTEGER NOT NULL DEFAULT 0,
      is_read INTEGER NOT NULL DEFAULT 0,
      direction TEXT NOT NULL DEFAULT 'outbound',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction, is_read)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id)`)

  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      name TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',
      expires_at TEXT,
      last_used TEXT,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}
