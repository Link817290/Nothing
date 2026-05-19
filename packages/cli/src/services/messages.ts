import { getDb, saveDb } from '../db.js'
import { randomBytes } from 'crypto'
import type { Database } from 'sql.js'
import type { NmpPayload } from '@nothingmail/nmp'
import type { SendRequest, SendResponse, InboxQuery, InboxResponse, MessageDetail, MessageSummary, ReplyRequest, ReplyResponse } from '@nothingmail/nmp/api'
import { loadConfig } from '../config.js'

function genId() {
  return `msg_${randomBytes(8).toString('base64url')}`
}

// ─── sql.js helpers ─────────────────────────────────────────────

function queryAll(db: Database, sql: string, params: unknown[] = []): Record<string, any>[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as any[])
  const results: Record<string, any>[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function queryOne(db: Database, sql: string, params: unknown[] = []): Record<string, any> | null {
  const stmt = db.prepare(sql)
  stmt.bind(params as any[])
  const result = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return result
}

// ─── Message service ────────────────────────────────────────────

export async function sendMessage(req: SendRequest): Promise<SendResponse> {
  const db = await getDb()
  const config = loadConfig()
  const id = genId()
  const threadId = id
  const from = config.email || 'local@nothing'
  const subject = req.subject || req.text.slice(0, 50)

  const payload: NmpPayload = {
    nmp: 1,
    type: req.type || 'share',
    agent: (req as any).agent || undefined,
    project: req.project,
    labels: req.labels,
    priority: req.priority,
    require: req.require,
    reply_schema: req.reply_schema,
    ack: req.ack,
  }

  const jp = JSON.stringify(payload)
  const lb = JSON.stringify(req.labels || [])
  const att = req.files?.length ? 1 : 0

  // Write outbound record (status: queued)
  db.run(
    `INSERT INTO messages (id,from_address,to_address,subject,content,json_payload,project,labels,channel_id,status,source,thread_id,direction,has_attachments)
     VALUES (?,?,?,?,?,?,?,?,?,'queued','nmp',?,'outbound',?)`,
    [id, from, req.to, subject, req.text, jp, req.project||null, lb, config.provider || 'local', threadId, att]
  )
  saveDb()

  // Send via SMTP (if configured, otherwise local-only)
  const { smtpSend } = await import('./smtp.js')
  let status: string = 'sent'
  try {
    const result = await smtpSend({ from, to: req.to, subject, text: req.text, payload })
    status = result.accepted ? 'sent' : 'failed'

    // If local mode (no SMTP), also create inbound copy for local delivery
    if (result.messageId.startsWith('local_')) {
      db.run(
        `INSERT INTO messages (id,from_address,to_address,subject,content,json_payload,project,labels,status,source,thread_id,direction,has_attachments)
         VALUES (?,?,?,?,?,?,?,?,'delivered','nmp',?,'inbound',?)`,
        [`${id}_in`, from, req.to, subject, req.text, jp, req.project||null, lb, threadId, att]
      )
    }
  } catch (err) {
    status = 'failed'
  }

  // Update outbound status
  db.run(`UPDATE messages SET status=?,updated_at=datetime('now') WHERE id=?`, [status, id])
  saveDb()

  return { success: status !== 'failed', message_id: id, status: status as SendResponse['status'] }
}

export async function getInbox(query: InboxQuery): Promise<InboxResponse> {
  const db = await getDb()
  let sql = `SELECT * FROM messages WHERE direction='inbound'`
  const p: unknown[] = []

  if (query.unread !== false) { sql += ` AND is_read=0` }
  if (query.project) { sql += ` AND project=?`; p.push(query.project) }
  if (query.label) { sql += ` AND labels LIKE ?`; p.push(`%${query.label}%`) }
  if ((query as any).source) { sql += ` AND source=?`; p.push((query as any).source) }
  if ((query as any).agent) { sql += ` AND agent=?`; p.push((query as any).agent) }
  if ((query as any).channel) { sql += ` AND channel_id=?`; p.push((query as any).channel) }
  sql += ` ORDER BY created_at DESC LIMIT ?`
  p.push(query.limit || 20)

  const rows = queryAll(db, sql, p)
  const c = queryOne(db, `SELECT COUNT(*) as count FROM messages WHERE direction='inbound' AND is_read=0`)

  return { messages: rows.map(rowToSummary), total_unread: (c?.count as number) ?? 0 }
}

export async function getSent(query: { project?: string; limit?: number }): Promise<{ messages: MessageSummary[] }> {
  const db = await getDb()
  let sql = `SELECT * FROM messages WHERE direction='outbound'`
  const p: unknown[] = []
  if (query.project) { sql += ` AND project=?`; p.push(query.project) }
  if ((query as any).channel) { sql += ` AND channel_id=?`; p.push((query as any).channel) }
  sql += ` ORDER BY created_at DESC LIMIT ?`
  p.push(query.limit || 20)

  return { messages: queryAll(db, sql, p).map(rowToSummary) }
}

export async function getMessage(id: string): Promise<MessageDetail | null> {
  const db = await getDb()
  const row = queryOne(db, `SELECT * FROM messages WHERE id=?`, [id])
  if (!row) return null

  if (!row.is_read && row.direction === 'inbound') {
    db.run(`UPDATE messages SET is_read=1,updated_at=datetime('now') WHERE id=?`, [id])
    saveDb()
  }

  const thread = row.thread_id
    ? queryAll(db, `SELECT * FROM messages WHERE thread_id=? ORDER BY created_at ASC`, [row.thread_id])
    : []

  const payload = row.json_payload ? JSON.parse(row.json_payload as string) as NmpPayload : null

  return {
    id: row.id as string,
    from: row.from_address as string,
    to: row.to_address as string,
    subject: row.subject as string,
    date: row.created_at as string,
    type: payload?.type || 'share',
    content: row.content as string,
    project: (row.project as string) || undefined,
    labels: JSON.parse((row.labels as string) || '[]'),
    context: payload?.context,
    status: row.status as MessageDetail['status'],
    source: row.source as MessageDetail['source'],
    attachments: [],
    thread: thread.map(t => ({
      id: t.id as string,
      from: t.from_address as string,
      preview: (t.content as string).slice(0, 80),
      date: t.created_at as string,
    })),
  }
}

export async function replyMessage(id: string, req: ReplyRequest): Promise<ReplyResponse> {
  const db = await getDb()
  const original = queryOne(db, `SELECT * FROM messages WHERE id=?`, [id])
  if (!original) throw new Error('Message not found')

  const config = loadConfig()
  const replyId = genId()
  const from = config.email || 'local@nothing'
  const subject = `Re: ${original.subject}`
  const threadId = (original.thread_id || original.id) as string

  const payload: NmpPayload = {
    nmp: 1, type: 'reply',
    project: (original.project as string) || undefined,
    labels: JSON.parse((original.labels as string) || '[]'),
  }
  const jp = JSON.stringify(payload)
  const att = req.files?.length ? 1 : 0

  // Write outbound record (status: queued)
  db.run(
    `INSERT INTO messages (id,from_address,to_address,subject,content,json_payload,project,labels,status,source,thread_id,in_reply_to,direction,has_attachments)
     VALUES (?,?,?,?,?,?,?,?,'queued','nmp',?,?,'outbound',?)`,
    [replyId, from, original.from_address, subject, req.text, jp, original.project||null, original.labels||'[]', threadId, id, att]
  )
  saveDb()

  // Send via SMTP
  const { smtpSend } = await import('./smtp.js')
  let status: string = 'sent'
  try {
    const result = await smtpSend({
      from, to: original.from_address as string, subject, text: req.text, payload,
      inReplyTo: id,
      references: [id],
    })
    status = result.accepted ? 'sent' : 'failed'

    if (result.messageId.startsWith('local_')) {
      db.run(
        `INSERT INTO messages (id,from_address,to_address,subject,content,json_payload,project,labels,status,source,thread_id,in_reply_to,direction,has_attachments)
         VALUES (?,?,?,?,?,?,?,?,'delivered','nmp',?,?,'inbound',?)`,
        [`${replyId}_in`, from, original.from_address, subject, req.text, jp, original.project||null, original.labels||'[]', threadId, id, att]
      )
    }
  } catch {
    status = 'failed'
  }

  db.run(`UPDATE messages SET status=?,updated_at=datetime('now') WHERE id=?`, [status, replyId])
  db.run(`UPDATE messages SET status='replied',updated_at=datetime('now') WHERE id=?`, [id])
  saveDb()

  return { success: status !== 'failed', message_id: replyId, status: status as ReplyResponse['status'] }
}

export async function getProjects() {
  const db = await getDb()
  const rows = queryAll(db,
    `SELECT project, COUNT(*) as total,
       SUM(CASE WHEN is_read=0 AND direction='inbound' THEN 1 ELSE 0 END) as unread,
       MAX(created_at) as last_activity
     FROM messages WHERE project IS NOT NULL GROUP BY project ORDER BY last_activity DESC`)

  return {
    projects: rows.map(r => ({
      name: r.project as string,
      total: r.total as number,
      unread: r.unread as number,
      last_activity: r.last_activity as string,
    })),
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function stripHtml(s: string): string {
  if (!s) return ''
  return s
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Row → Summary ──────────────────────────────────────────────

function rowToSummary(row: Record<string, any>): MessageSummary {
  let type = 'share'
  try { type = JSON.parse(row.json_payload || '{}').type || 'share' } catch {}

  return {
    id: row.id,
    from: row.from_address,
    to: row.to_address,
    subject: row.subject,
    preview: stripHtml(row.content as string).slice(0, 120),
    date: row.created_at,
    type: type as MessageSummary['type'],
    status: row.direction === 'outbound' ? row.status : undefined,
    source: row.source || undefined,
    agent: row.agent || undefined,
    channel: row.channel_id ? { id: row.channel_id, name: row.channel_id, email: '' } : undefined,
    unread: row.is_read === 0,
    has_attachments: row.has_attachments === 1,
    project: row.project || undefined,
    labels: JSON.parse(row.labels || '[]'),
  }
}
