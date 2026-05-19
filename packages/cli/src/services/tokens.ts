import { getDb, saveDb } from '../db.js'
import { randomBytes, createHash } from 'crypto'
import type { TokenInfo, CreateTokenRequest, CreateTokenResponse, TokenPermission } from '@nothingmail/nmp/api'

function genTokenId() {
  return `tok_${randomBytes(6).toString('base64url')}`
}

function genTokenValue() {
  return `ntk_live_${randomBytes(24).toString('base64url')}`
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function listTokens(): Promise<TokenInfo[]> {
  const db = await getDb()
  const stmt = db.prepare(`SELECT * FROM tokens ORDER BY created_at DESC`)
  const rows: Record<string, any>[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()

  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    token_preview: `ntk_live_${(r.token_hash as string).slice(0, 8)}...`,
    permissions: JSON.parse((r.permissions as string) || '[]') as TokenPermission[],
    last_used: (r.last_used as string) || undefined,
    expires_at: (r.expires_at as string) || undefined,
    created_at: r.created_at as string,
    revoked: r.revoked === 1,
  }))
}

export async function createToken(req: CreateTokenRequest): Promise<CreateTokenResponse> {
  const db = await getDb()
  const id = genTokenId()
  const token = genTokenValue()
  const hash = hashToken(token)

  db.run(
    `INSERT INTO tokens (id, user_id, name, token_hash, permissions, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, 'local', req.name, hash, JSON.stringify(req.permissions), req.expires_at || null]
  )

  saveDb()
  return { id, token, name: req.name, permissions: req.permissions }
}

export async function revokeToken(id: string): Promise<boolean> {
  const db = await getDb()
  db.run(`UPDATE tokens SET revoked = 1 WHERE id = ?`, [id])
  saveDb()
  return true
}
