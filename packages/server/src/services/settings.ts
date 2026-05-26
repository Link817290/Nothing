import { queryOne, queryAll, run } from '../repositories/db.js'

const DEFAULTS: Record<string, string> = {
  open_registration: 'true',
  server_name: 'Nothing Server',
  max_accounts_per_user: '5',
}

export async function getSetting(key: string): Promise<string> {
  const row = await queryOne('SELECT value FROM server_settings WHERE key = $1', [key])
  return row ? row.value : (DEFAULTS[key] || '')
}

export async function setSetting(key: string, value: string) {
  const existing = await queryOne('SELECT key FROM server_settings WHERE key = $1', [key])
  if (existing) {
    await run('UPDATE server_settings SET value = $1 WHERE key = $2', [value, key])
  } else {
    await run('INSERT INTO server_settings (key, value) VALUES ($1, $2)', [key, value])
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await queryAll('SELECT key, value FROM server_settings')
  const result = { ...DEFAULTS }
  for (const row of rows) {
    result[row.key] = row.value
  }
  return result
}
