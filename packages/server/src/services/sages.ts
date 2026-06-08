import { randomBytes } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'

function genId() {
  return `sage_${randomBytes(8).toString('base64url')}`
}

// ─── Register ────────────────────────────────────────────────

export async function registerSage(
  userId: string,
  sage: { id?: string; name: string; description?: string; version?: string; keywords?: string[]; sage_json?: any },
  authorEmail?: string,
): Promise<string> {
  const sageId = sage.id || genId()
  const keywords = sage.keywords || []

  const existing = await queryOne(
    'SELECT id FROM sages WHERE id = $1 AND owner_user_id = $2',
    [sageId, userId],
  )

  if (existing) {
    await run(
      `UPDATE sages SET name = $1, description = $2, version = $3, keywords = $4, author_email = $5, sage_json = $6, updated_at = NOW()
       WHERE id = $7 AND owner_user_id = $8`,
      [sage.name, sage.description || null, sage.version || null, keywords, authorEmail || null, JSON.stringify(sage.sage_json || sage), sageId, userId],
    )
    return sageId
  }

  await run(
    `INSERT INTO sages (id, owner_user_id, name, description, version, author_email, keywords, sage_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sageId, userId, sage.name, sage.description || null, sage.version || null, authorEmail || null, keywords, JSON.stringify(sage.sage_json || sage)],
  )

  return sageId
}

// ─── List ────────────────────────────────────────────────────

export async function listSages(userId: string, opts?: { installed?: boolean; keyword?: string }) {
  let sql = 'SELECT * FROM sages WHERE owner_user_id = $1'
  const params: unknown[] = [userId]
  let idx = 2

  if (opts?.installed !== undefined) {
    sql += ` AND installed = $${idx}`
    params.push(opts.installed)
    idx++
  }
  if (opts?.keyword) {
    sql += ` AND (keywords @> ARRAY[$${idx}]::text[] OR name ILIKE '%' || $${idx} || '%')`
    params.push(opts.keyword)
    idx++
  }

  sql += ' ORDER BY installed DESC, created_at DESC'
  return queryAll(sql, params)
}

// ─── Get ─────────────────────────────────────────────────────

export async function getSage(userId: string, id: string) {
  return queryOne(
    'SELECT * FROM sages WHERE id = $1 AND owner_user_id = $2',
    [id, userId],
  )
}

// ─── Search ──────────────────────────────────────────────────

export async function searchSages(userId: string, keyword: string) {
  return queryAll(
    `SELECT * FROM sages
     WHERE owner_user_id = $1
       AND (keywords @> ARRAY[$2]::text[] OR name ILIKE '%' || $2 || '%')
     ORDER BY installed DESC, created_at DESC
     LIMIT 20`,
    [userId, keyword],
  )
}

// ─── Install / Uninstall ─────────────────────────────────────

export async function setInstalled(userId: string, sageId: string, installed: boolean) {
  await run(
    'UPDATE sages SET installed = $1, updated_at = NOW() WHERE id = $2 AND owner_user_id = $3',
    [installed, sageId, userId],
  )
}
