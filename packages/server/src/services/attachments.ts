import { randomBytes } from 'crypto'
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { queryAll, queryOne, run } from '../repositories/db.js'

const STORAGE_DIR = process.env.ATTACHMENT_DIR || '/data/attachments'

function genId() {
  return `att_${randomBytes(8).toString('base64url')}`
}

function ensureDir(path: string) {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/** Save an attachment to disk and DB */
export async function saveAttachment(messageId: string, filename: string, contentType: string, content: Buffer): Promise<string> {
  const id = genId()
  const subdir = messageId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const storagePath = join(STORAGE_DIR, subdir, `${id}_${filename}`)

  ensureDir(storagePath)
  writeFileSync(storagePath, content)

  await run(
    `INSERT INTO attachments (id, message_id, filename, content_type, size, storage_path) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, messageId, filename, contentType, content.length, storagePath]
  )

  return id
}

/** List attachments for a message */
export async function listAttachments(messageId: string) {
  return queryAll(
    'SELECT id, filename, content_type, size, created_at FROM attachments WHERE message_id = $1',
    [messageId]
  )
}

/** Get attachment file content */
export async function getAttachment(id: string): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  const row = await queryOne('SELECT * FROM attachments WHERE id = $1', [id])
  if (!row) return null

  try {
    const content = readFileSync(row.storage_path)
    return { filename: row.filename, contentType: row.content_type, content }
  } catch {
    return null
  }
}

/** Delete attachments for a message */
export async function deleteAttachments(messageId: string) {
  const atts = await queryAll('SELECT storage_path FROM attachments WHERE message_id = $1', [messageId])
  for (const att of atts) {
    try { unlinkSync(att.storage_path) } catch {}
  }
  await run('DELETE FROM attachments WHERE message_id = $1', [messageId])
}
