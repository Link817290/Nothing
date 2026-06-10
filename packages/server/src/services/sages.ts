import { randomBytes } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'

function genId() {
  return `sage_${randomBytes(8).toString('base64url')}`
}

// ─── Register ────────────────────────────────────────────────

export async function registerSage(
  userId: string,
  sage: { id?: string; name: string; description?: string; version?: string; keywords?: string[]; sage_json?: any; public?: boolean },
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
      `UPDATE sages SET name = $1, description = $2, version = $3, keywords = $4, author_email = $5, sage_json = $6, public = $7, updated_at = NOW()
       WHERE id = $8 AND owner_user_id = $9`,
      [sage.name, sage.description || null, sage.version || null, keywords, authorEmail || null, JSON.stringify(sage.sage_json || sage), sage.public || false, sageId, userId],
    )
    return sageId
  }

  await run(
    `INSERT INTO sages (id, owner_user_id, name, description, version, author_email, keywords, sage_json, public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [sageId, userId, sage.name, sage.description || null, sage.version || null, authorEmail || null, keywords, JSON.stringify(sage.sage_json || sage), sage.public || false],
  )

  return sageId
}

// ─── List (own sages) ────────────────────────────────────────

export async function listSages(userId: string, opts?: { favorited?: boolean; keyword?: string }) {
  // Favorited: only own sages marked as favorited
  if (opts?.favorited) {
    let sql = 'SELECT * FROM sages WHERE owner_user_id = $1 AND favorited = TRUE'
    const params: unknown[] = [userId]
    let idx = 2
    if (opts.keyword) {
      sql += ` AND (keywords @> ARRAY[$${idx}]::text[] OR name ILIKE '%' || $${idx} || '%')`
      params.push(opts.keyword)
      idx++
    }
    sql += ' ORDER BY created_at DESC'
    return queryAll(sql, params)
  }

  // All: own sages UNION all public sages from others
  let keywordFilter = ''
  const params: unknown[] = [userId, userId]
  let idx = 3
  if (opts?.keyword) {
    keywordFilter = ` AND (keywords @> ARRAY[$${idx}]::text[] OR name ILIKE '%' || $${idx} || '%')`
    params.push(opts.keyword)
    idx++
  }

  return queryAll(
    `SELECT * FROM sages WHERE owner_user_id = $1${keywordFilter}
     UNION
     SELECT * FROM sages WHERE public = TRUE AND owner_user_id != $2${keywordFilter}
     ORDER BY favorited DESC, created_at DESC`,
    params,
  )
}

// ─── Get ─────────────────────────────────────────────────────

export async function getSage(userId: string, id: string) {
  return queryOne(
    'SELECT * FROM sages WHERE id = $1 AND owner_user_id = $2',
    [id, userId],
  )
}

// ─── Get public sage (any user can read) ─────────────────────

export async function getPublicSage(id: string) {
  return queryOne(
    'SELECT * FROM sages WHERE id = $1 AND public = TRUE',
    [id],
  )
}

// ─── Search (own sages) ──────────────────────────────────────

export async function searchSages(userId: string, keyword: string) {
  return queryAll(
    `SELECT * FROM sages
     WHERE (owner_user_id = $1 OR public = TRUE)
       AND (keywords @> ARRAY[$2]::text[] OR name ILIKE '%' || $2 || '%')
     ORDER BY favorited DESC, created_at DESC
     LIMIT 20`,
    [userId, keyword],
  )
}

// ─── Favorite / Unfavorite ───────────────────────────────────

export async function setFavorited(userId: string, sageId: string, favorited: boolean) {
  await run(
    'UPDATE sages SET favorited = $1, updated_at = NOW() WHERE id = $2 AND owner_user_id = $3',
    [favorited, sageId, userId],
  )
}

// ─── Public profile: list a user's public sages ──────────────

export async function listPublicSages(username: string) {
  return queryAll(
    `SELECT s.id, s.name, s.description, s.version, s.author_email, s.keywords, s.created_at
     FROM sages s JOIN users u ON s.owner_user_id = u.id
     WHERE u.username = $1 AND s.public = TRUE
     ORDER BY s.created_at DESC`,
    [username],
  )
}
