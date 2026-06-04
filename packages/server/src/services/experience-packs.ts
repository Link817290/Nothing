import { randomBytes } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'
import type { NmpExperiencePack } from '@nothingmail/nmp'

function genId() {
  return `pack_${randomBytes(8).toString('base64url')}`
}

// ─── Register ────────────────────────────────────────────────

export async function registerPack(
  userId: string,
  capsuleId: string,
  messageId: string,
  pack: NmpExperiencePack,
  fromAddress?: string,
): Promise<string> {
  const packId = pack.id || capsuleId
  const keywords = pack.activation?.keywords || []

  const existing = await queryOne(
    'SELECT id FROM experience_packs WHERE id = $1 AND owner_user_id = $2',
    [packId, userId],
  )

  if (existing) {
    await run(
      `UPDATE experience_packs SET name = $1, keywords = $2, metadata_json = $3, updated_at = NOW() WHERE id = $4 AND owner_user_id = $5`,
      [pack.name, keywords, JSON.stringify(pack), packId, userId],
    )
    return packId
  }

  await run(
    `INSERT INTO experience_packs (id, owner_user_id, capsule_id, source_message_id, name, kind, description, author_email, installable, runnable, keywords, metadata_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      packId, userId, capsuleId, messageId,
      pack.name, pack.kind || 'execution_capsule', null,
      fromAddress || pack.source?.author || null,
      pack.installable !== false, pack.runnable !== false,
      keywords, JSON.stringify(pack),
    ],
  )

  return packId
}

// ─── List ────────────────────────────────────────────────────

export async function listPacks(userId: string, opts?: { installed?: boolean; keyword?: string }) {
  // "installed" filter → only from experience_packs table
  if (opts?.installed !== undefined) {
    let sql = 'SELECT * FROM experience_packs WHERE owner_user_id = $1 AND installed = $2'
    const params: unknown[] = [userId, opts.installed]
    let idx = 3
    if (opts.keyword) {
      sql += ` AND (keywords @> ARRAY[$${idx}]::text[] OR name ILIKE '%' || $${idx} || '%')`
      params.push(opts.keyword)
    }
    sql += ' ORDER BY created_at DESC'
    return queryAll(sql, params)
  }

  // "all" → merge execution_capsules + experience_packs (installed status)
  let keywordFilter = ''
  const params: unknown[] = [userId]
  let idx = 2
  if (opts?.keyword) {
    keywordFilter = ` AND (c.name ILIKE '%' || $${idx} || '%')`
    params.push(opts.keyword)
    idx++
  }

  const rows = await queryAll(
    `SELECT
       c.id AS capsule_id,
       c.name,
       c.version,
       c.description,
       c.source_message_id,
       c.created_at,
       c.capsule_json,
       p.id AS pack_id,
       p.installed,
       p.keywords,
       p.author_email,
       p.kind
     FROM execution_capsules c
     LEFT JOIN experience_packs p ON p.capsule_id = c.id AND p.owner_user_id = $1
     WHERE c.owner_user_id = $1${keywordFilter}
     ORDER BY COALESCE(p.installed, FALSE) DESC, c.created_at DESC`,
    params,
  )

  return rows.map((r) => {
    const capsule = typeof r.capsule_json === 'string' ? JSON.parse(r.capsule_json) : r.capsule_json
    const keywords = r.keywords || capsule?.activation?.keywords || []
    return {
      id: r.pack_id || r.capsule_id,
      capsule_id: r.capsule_id,
      name: r.name,
      kind: r.kind || 'execution_capsule',
      description: r.description,
      author_email: r.author_email,
      installable: true,
      runnable: true,
      installed: r.installed || false,
      keywords: Array.isArray(keywords) ? keywords : [],
      source_message_id: r.source_message_id,
      created_at: r.created_at,
    }
  })
}

// ─── Get ─────────────────────────────────────────────────────

export async function getPack(userId: string, id: string) {
  // Try pack ID first
  let row = await queryOne(
    'SELECT * FROM experience_packs WHERE id = $1 AND owner_user_id = $2',
    [id, userId],
  )
  // Fallback: try capsule_id
  if (!row) {
    row = await queryOne(
      'SELECT * FROM experience_packs WHERE capsule_id = $1 AND owner_user_id = $2',
      [id, userId],
    )
  }
  return row || null
}

// ─── Search ──────────────────────────────────────────────────

export async function searchPacks(userId: string, keyword: string) {
  // Search across both tables: installed packs + all capsules
  const rows = await queryAll(
    `SELECT
       c.id AS capsule_id, c.name, c.description, c.source_message_id,
       c.created_at, c.capsule_json,
       p.id AS pack_id, p.installed, p.keywords, p.author_email, p.kind
     FROM execution_capsules c
     LEFT JOIN experience_packs p ON p.capsule_id = c.id AND p.owner_user_id = $1
     WHERE c.owner_user_id = $1
       AND (c.name ILIKE '%' || $2 || '%'
            OR p.keywords @> ARRAY[$2]::text[]
            OR c.capsule_json::text ILIKE '%' || $2 || '%')
     ORDER BY COALESCE(p.installed, FALSE) DESC, c.created_at DESC
     LIMIT 20`,
    [userId, keyword],
  )

  return rows.map((r) => {
    const capsule = typeof r.capsule_json === 'string' ? JSON.parse(r.capsule_json) : r.capsule_json
    const keywords = r.keywords || capsule?.activation?.keywords || []
    return {
      id: r.pack_id || r.capsule_id,
      capsule_id: r.capsule_id,
      name: r.name,
      kind: r.kind || 'execution_capsule',
      description: r.description,
      author_email: r.author_email,
      installable: true,
      runnable: true,
      installed: r.installed || false,
      keywords: Array.isArray(keywords) ? keywords : [],
      source_message_id: r.source_message_id,
      created_at: r.created_at,
    }
  })
}

// ─── Install / Uninstall ─────────────────────────────────────

export async function setInstalled(userId: string, packId: string, installed: boolean) {
  await run(
    'UPDATE experience_packs SET installed = $1, updated_at = NOW() WHERE id = $2 AND owner_user_id = $3',
    [installed, packId, userId],
  )
}

// ─── Find by keyword (AI activation) ─────────────────────────

export async function findByKeyword(userId: string, keyword: string) {
  return queryOne(
    `SELECT * FROM experience_packs
     WHERE owner_user_id = $1 AND installed = TRUE
       AND keywords @> ARRAY[$2]::text[]
     ORDER BY created_at DESC LIMIT 1`,
    [userId, keyword],
  )
}
