import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  external_email TEXT,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  permissions JSONB NOT NULL DEFAULT '["read","write"]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS server_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  email TEXT NOT NULL,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 465,
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  auth_user TEXT NOT NULL,
  auth_pass_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES email_accounts(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  json_payload JSONB,
  agent TEXT,
  project TEXT,
  labels JSONB DEFAULT '[]',
  channel_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  source TEXT NOT NULL DEFAULT 'nmp',
  thread_id TEXT,
  in_reply_to TEXT,
  smtp_message_id TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(user_id, direction);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(user_id, project);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_smtp_msgid ON messages(smtp_message_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  external_email TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  password_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_external ON verification_codes(external_email);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);

-- ─── Sages (Expert Service Protocols) ────────────────────────────

CREATE TABLE IF NOT EXISTS sages (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author_email TEXT,
  installed BOOLEAN NOT NULL DEFAULT FALSE,
  keywords TEXT[] DEFAULT '{}',
  sage_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Thread Summaries ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS thread_summaries (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  message_ids JSONB,
  message_count INTEGER DEFAULT 0,
  generated_by TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_summaries_thread ON thread_summaries(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_summaries_user ON thread_summaries(user_id);

CREATE INDEX IF NOT EXISTS idx_sages_owner ON sages(owner_user_id);

-- Trigram index for full-text search (safe if extension not available)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_messages_subject_trgm ON messages USING gin (subject gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON messages USING gin (content gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_sages_keywords ON sages USING gin (keywords);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`

export async function initDb(databaseUrl: string): Promise<void> {
  pool = new Pool({ connectionString: databaseUrl })

  // Test connection
  const client = await pool.connect()
  try {
    await client.query(SCHEMA)
  } finally {
    client.release()
  }
}

export function getPool(): pg.Pool {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.')
  return pool
}

export async function closeDb() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// ─── Query helpers ─────────────────────────────────────────────

export async function queryAll(sql: string, params: unknown[] = []): Promise<Record<string, any>[]> {
  const result = await getPool().query(sql, params)
  return result.rows
}

export async function queryOne(sql: string, params: unknown[] = []): Promise<Record<string, any> | null> {
  const result = await getPool().query(sql, params)
  return result.rows[0] || null
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  await getPool().query(sql, params)
}

export async function withTransaction<T>(fn: (query: (sql: string, params?: unknown[]) => Promise<void>) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const query = async (sql: string, params: unknown[] = []) => { await client.query(sql, params) }
    const result = await fn(query)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
