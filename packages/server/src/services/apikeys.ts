import { randomBytes, createHash } from 'crypto'
import { queryOne, queryAll, run } from '../repositories/db.js'

export type Permission = 'read' | 'write' | 'admin'

function genId() {
  return `key_${randomBytes(8).toString('base64url')}`
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function createApiKey(userId: string, name?: string, permissions?: Permission[]): Promise<{ id: string; key: string }> {
  const id = genId()
  const raw = `ntk_${randomBytes(24).toString('base64url')}`
  const hash = hashKey(raw)
  const perms = JSON.stringify(permissions || ['read', 'write'])

  await run(
    `INSERT INTO api_keys (id, user_id, key_hash, name, permissions) VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, hash, name || 'default', perms]
  )

  return { id, key: raw }
}

export async function verifyApiKey(key: string): Promise<{ userId: string; permissions: Permission[] } | null> {
  const hash = hashKey(key)
  const row = await queryOne('SELECT user_id, permissions FROM api_keys WHERE key_hash = $1', [hash])
  if (!row) return null
  const perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions
  return { userId: row.user_id, permissions: perms }
}

export async function listApiKeys(userId: string) {
  const rows = await queryAll('SELECT id, name, permissions, created_at FROM api_keys WHERE user_id = $1', [userId])
  return rows.map(r => ({
    id: r.id, name: r.name,
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions,
    created_at: r.created_at,
  }))
}

export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const existing = await queryOne('SELECT id FROM api_keys WHERE id = $1 AND user_id = $2', [keyId, userId])
  if (!existing) return false
  await run('DELETE FROM api_keys WHERE id = $1', [keyId])
  return true
}
