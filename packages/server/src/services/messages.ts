import { randomBytes } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'
import { getFirstAccount, getUserAccount, decrypt } from './accounts.js'
import type { SendRequest, InboxQuery } from '../types/index.js'
import type { NmpPayload } from '@nothingmail/nmp'

function genId() {
  return `msg_${randomBytes(8).toString('base64url')}`
}

// ─── Send ──────────────────────────────────────────────────────

export async function sendMessage(userId: string, req: SendRequest) {
  const account = req.account_id
    ? await getUserAccount(userId, req.account_id)
    : await getFirstAccount(userId)

  if (!account) throw new Error('No email account configured. Add one first.')

  const id = genId()
  const from = account.email
  const subject = req.subject || req.text.slice(0, 50)

  const payload: NmpPayload = {
    nmp: 1, type: (req.type as any) || 'nmp:chat',
    agent: req.agent, project: req.project, labels: req.labels,
    priority: (req.priority as any), require: req.require,
    help_request: req.help_request,
    execution_capsule: req.execution_capsule,
    capsule_run: req.capsule_run,
    capsule_event: req.capsule_event,
    artifact: req.artifact,
  }

  const hasAttachments = (req.attachments?.length || 0) > 0

  await run(
    `INSERT INTO messages (id, user_id, account_id, from_address, to_address, subject, content, json_payload, agent, project, labels, channel_id, status, source, thread_id, direction, has_attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'queued', 'nmp', $13, 'outbound', $14)`,
    [id, userId, account.id, from, req.to, subject, req.text, JSON.stringify(payload), req.agent || null, req.project || null, JSON.stringify(req.labels || []), account.provider, id, hasAttachments]
  )

  // Save outbound attachments to disk
  if (hasAttachments) {
    const { saveAttachment } = await import('./attachments.js')
    for (const att of req.attachments!) {
      await saveAttachment(id, att.filename, att.content_type || 'application/octet-stream', Buffer.from(att.content, 'base64'))
    }
  }

  let status = 'sent'
  try {
    const { smtpSend } = await import('../mail/smtp.js')
    // Pass user attachments to SMTP
    const userAttachments = req.attachments?.map(a => ({
      filename: a.filename,
      content: Buffer.from(a.content, 'base64'),
      contentType: a.content_type || 'application/octet-stream',
    }))
    const result = await smtpSend({ account, from, to: req.to, subject, text: req.text, payload, userAttachments })
    status = result.accepted ? 'sent' : 'failed'
    // Store SMTP Message-ID for thread matching
    if (result.messageId) {
      await run(`UPDATE messages SET smtp_message_id = $1 WHERE id = $2`, [result.messageId, id])
    }
  } catch (e) {
    status = 'failed'
    const errMsg = (e as Error).message
    await run(`UPDATE messages SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`, [errMsg, id])
    return { success: false, message_id: id, status, error: errMsg }
  }

  await run(`UPDATE messages SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id])

  return { success: status !== 'failed', message_id: id, status }
}

// ─── Inbox ─────────────────────────────────────────────────────

export async function getInbox(userId: string, query: InboxQuery) {
  let sql = `SELECT * FROM messages WHERE user_id = $1 AND direction = 'inbound'`
  const p: unknown[] = [userId]
  let idx = 2

  if (query.unread === true) { sql += ` AND is_read = FALSE` }
  if (query.project) { sql += ` AND project = $${idx}`; p.push(query.project); idx++ }
  if (query.label) { sql += ` AND labels @> $${idx}::jsonb`; p.push(JSON.stringify([query.label])); idx++ }
  if (query.source) { sql += ` AND source = $${idx}`; p.push(query.source); idx++ }
  if (query.agent) { sql += ` AND agent = $${idx}`; p.push(query.agent); idx++ }
  if (query.channel) { sql += ` AND channel_id = $${idx}`; p.push(query.channel); idx++ }
  if (query.account_id) { sql += ` AND account_id = $${idx}`; p.push(query.account_id); idx++ }
  sql += ` ORDER BY created_at DESC LIMIT $${idx}`
  p.push(query.limit || 20)

  const rows = await queryAll(sql, p)
  const c = await queryOne(`SELECT COUNT(*) as c FROM messages WHERE user_id = $1 AND direction = 'inbound' AND is_read = FALSE`, [userId])

  return { messages: rows.map(rowToSummary), total_unread: parseInt(c?.c) || 0 }
}

// ─── Sent ──────────────────────────────────────────────────────

export async function getSent(userId: string, query: { project?: string; channel?: string; limit?: number }) {
  let sql = `SELECT * FROM messages WHERE user_id = $1 AND direction = 'outbound'`
  const p: unknown[] = [userId]
  let idx = 2
  if (query.project) { sql += ` AND project = $${idx}`; p.push(query.project); idx++ }
  if (query.channel) { sql += ` AND channel_id = $${idx}`; p.push(query.channel); idx++ }
  sql += ` ORDER BY created_at DESC LIMIT $${idx}`
  p.push(query.limit || 20)

  return { messages: (await queryAll(sql, p)).map(rowToSummary) }
}

// ─── Read ──────────────────────────────────────────────────────

export async function getMessage(userId: string, id: string) {
  const row = await queryOne(`SELECT * FROM messages WHERE id = $1 AND user_id = $2`, [id, userId])
  if (!row) return null

  if (!row.is_read && row.direction === 'inbound') {
    await run(`UPDATE messages SET is_read = TRUE, updated_at = NOW() WHERE id = $1`, [id])
  }

  const thread = row.thread_id
    ? await queryAll(`SELECT * FROM messages WHERE thread_id = $1 AND user_id = $2 ORDER BY created_at ASC`, [row.thread_id, userId])
    : []

  const payload = row.json_payload || null

  return {
    id: row.id, from: row.from_address, to: row.to_address,
    subject: row.subject, date: row.created_at,
    type: payload?.type || 'nmp:chat', content: row.content,
    project: row.project || undefined,
    labels: typeof row.labels === 'string' ? JSON.parse(row.labels) : (row.labels || []),
    context: payload?.context, status: row.status, source: row.source,
    attachments: await (async () => {
      try {
        const { listAttachments } = await import('./attachments.js')
        return listAttachments(id)
      } catch { return [] }
    })(),
    thread: thread.map(t => ({
      id: t.id, from: t.from_address,
      preview: stripHtml(t.content).slice(0, 80),
      date: t.created_at,
    })),
  }
}

// ─── Reply ─────────────────────────────────────────────────────

export async function replyMessage(userId: string, id: string, req: { text: string; files?: string[] }) {
  const original = await queryOne(`SELECT * FROM messages WHERE id = $1 AND user_id = $2`, [id, userId])
  if (!original) throw new Error('Message not found')

  const account = original.account_id
    ? await getUserAccount(userId, original.account_id)
    : await getFirstAccount(userId)
  if (!account) throw new Error('No email account configured')

  const replyId = genId()
  const from = account.email
  const subject = `Re: ${original.subject}`
  const threadId = original.thread_id || original.id
  const origLabels = typeof original.labels === 'string' ? JSON.parse(original.labels) : (original.labels || [])

  const payload: NmpPayload = {
    nmp: 1, type: 'nmp:reply',
    project: original.project || undefined,
    labels: origLabels,
  }

  await run(
    `INSERT INTO messages (id, user_id, account_id, from_address, to_address, subject, content, json_payload, project, labels, status, source, thread_id, in_reply_to, direction, has_attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'queued', 'nmp', $11, $12, 'outbound', $13)`,
    [replyId, userId, account.id, from, original.from_address, subject, req.text, JSON.stringify(payload), original.project || null, JSON.stringify(origLabels), threadId, id, req.files?.length ? true : false]
  )

  let status = 'sent'
  try {
    const { smtpSend } = await import('../mail/smtp.js')
    // Use original smtp_message_id for proper In-Reply-To threading
    const origSmtpId = original.smtp_message_id || original.id
    const result = await smtpSend({ account, from, to: original.from_address, subject, text: req.text, payload, inReplyTo: origSmtpId, references: [origSmtpId] })
    if (result.messageId) {
      await run(`UPDATE messages SET smtp_message_id = $1 WHERE id = $2`, [result.messageId, replyId])
    }
  } catch (e) {
    status = 'failed'
    const errMsg = (e as Error).message
    await run(`UPDATE messages SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`, [errMsg, replyId])
    return { success: false, message_id: replyId, status, error: errMsg }
  }

  await run(`UPDATE messages SET status = $1, updated_at = NOW() WHERE id = $2`, [status, replyId])
  await run(`UPDATE messages SET status = 'replied', updated_at = NOW() WHERE id = $1`, [id])

  return { success: status !== 'failed', message_id: replyId, status }
}

// ─── Projects ──────────────────────────────────────────────────

export async function getProjects(userId: string) {
  const rows = await queryAll(
    `SELECT project, COUNT(*) as total,
       SUM(CASE WHEN is_read = FALSE AND direction = 'inbound' THEN 1 ELSE 0 END) as unread,
       MAX(created_at) as last_activity
     FROM messages WHERE user_id = $1 AND project IS NOT NULL GROUP BY project ORDER BY last_activity DESC`,
    [userId]
  )
  return {
    projects: rows.map(r => ({ name: r.project, total: parseInt(r.total), unread: parseInt(r.unread), last_activity: r.last_activity })),
  }
}

// ─── Reports ───────────────────────────────────────────────────

export async function getReport(userId: string, query: { period?: string; project?: string }) {
  const period = getPeriodDates(query.period || 'week')
  const pf = query.project

  let where = `user_id = $1 AND created_at >= $2`
  const params: unknown[] = [userId, period.start]
  let idx = 3
  if (pf) { where += ` AND project = $${idx}`; params.push(pf); idx++ }

  const sent = await queryOne(`SELECT COUNT(*) as c FROM messages WHERE direction='outbound' AND ${where}`, params)
  const received = await queryOne(`SELECT COUNT(*) as c FROM messages WHERE direction='inbound' AND ${where}`, params)
  const replied = await queryOne(`SELECT COUNT(*) as c FROM messages WHERE status='replied' AND ${where}`, params)
  const failed = await queryOne(`SELECT COUNT(*) as c FROM messages WHERE status='failed' AND ${where}`, params)

  const projects = await queryAll(
    `SELECT project, COUNT(*) as messages, COUNT(DISTINCT thread_id) as threads,
       SUM(CASE WHEN status='replied' THEN 1 ELSE 0 END) as resolved
     FROM messages WHERE project IS NOT NULL AND ${where} GROUP BY project ORDER BY messages DESC`, params)

  const needsReply = await queryAll(
    `SELECT id, from_address, subject, created_at, project
     FROM messages WHERE direction='inbound' AND is_read=FALSE AND ${where} ORDER BY created_at DESC LIMIT 10`, params)

  const topThreads = await queryAll(
    `SELECT thread_id, MIN(subject) as subject, COUNT(*) as message_count,
       MAX(status) as status, MAX(created_at) as last_activity
     FROM messages WHERE thread_id IS NOT NULL AND ${where} GROUP BY thread_id ORDER BY message_count DESC LIMIT 10`, params)

  return {
    period,
    summary: { sent: parseInt(sent?.c) || 0, received: parseInt(received?.c) || 0, replied: parseInt(replied?.c) || 0, failed: parseInt(failed?.c) || 0 },
    projects: projects.map(r => ({ name: r.project, messages: parseInt(r.messages), threads: parseInt(r.threads), resolved: parseInt(r.resolved) })),
    needs_reply: needsReply.map(r => ({ id: r.id, from: r.from_address, subject: r.subject, date: r.created_at, project: r.project || undefined })),
    top_threads: topThreads.map(r => ({ thread_id: r.thread_id, subject: r.subject, message_count: parseInt(r.message_count), status: r.status, last_activity: r.last_activity })),
  }
}

// ─── Delete ────────────────────────────────────────────────────

export async function deleteMessage(userId: string, id: string): Promise<boolean> {
  const existing = await queryOne(`SELECT id FROM messages WHERE id = $1 AND user_id = $2`, [id, userId])
  if (!existing) return false
  // Delete attachments from disk first
  try {
    const { deleteAttachments } = await import('./attachments.js')
    await deleteAttachments(id)
  } catch {}
  await run(`DELETE FROM messages WHERE id = $1`, [id])
  return true
}

// ─── Mark read/unread ──────────────────────────────────────────

export async function setReadStatus(userId: string, id: string, isRead: boolean): Promise<boolean> {
  const existing = await queryOne(`SELECT id FROM messages WHERE id = $1 AND user_id = $2`, [id, userId])
  if (!existing) return false
  await run(`UPDATE messages SET is_read = $1, updated_at = NOW() WHERE id = $2`, [isRead, id])
  return true
}

// ─── Forward ───────────────────────────────────────────────────

export async function forwardMessage(userId: string, id: string, req: { to: string; text?: string }) {
  const original = await queryOne(`SELECT * FROM messages WHERE id = $1 AND user_id = $2`, [id, userId])
  if (!original) throw new Error('Message not found')

  const account = original.account_id
    ? await getUserAccount(userId, original.account_id)
    : await getFirstAccount(userId)
  if (!account) throw new Error('No email account configured')

  const fwdId = genId()
  const from = account.email
  const subject = `Fwd: ${original.subject}`
  const content = req.text ? `${req.text}\n\n--- Forwarded ---\n${original.content}` : original.content

  const payload: NmpPayload = {
    nmp: 1, type: 'nmp:chat',
    project: original.project || undefined,
  }

  await run(
    `INSERT INTO messages (id, user_id, account_id, from_address, to_address, subject, content, json_payload, project, labels, status, source, direction, has_attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'queued', 'nmp', 'outbound', $11)`,
    [fwdId, userId, account.id, from, req.to, subject, content, JSON.stringify(payload), original.project || null, JSON.stringify([]), original.has_attachments]
  )

  let status = 'sent'
  try {
    const { smtpSend } = await import('../mail/smtp.js')
    const result = await smtpSend({ account, from, to: req.to, subject, text: content, payload })
    if (result.messageId) {
      await run(`UPDATE messages SET smtp_message_id = $1 WHERE id = $2`, [result.messageId, fwdId])
    }
  } catch (e) {
    status = 'failed'
    const errMsg = (e as Error).message
    await run(`UPDATE messages SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`, [errMsg, fwdId])
    return { success: false, message_id: fwdId, status, error: errMsg }
  }

  await run(`UPDATE messages SET status = $1, updated_at = NOW() WHERE id = $2`, [status, fwdId])

  return { success: status !== 'failed', message_id: fwdId, status }
}

// ─── Search ────────────────────────────────────────────────────

export async function searchMessages(userId: string, query: { q: string; project?: string; limit?: number }) {
  const term = `%${query.q}%`
  let sql = `SELECT * FROM messages WHERE user_id = $1 AND (subject ILIKE $2 OR content ILIKE $2 OR from_address ILIKE $2)`
  const p: unknown[] = [userId, term]
  let idx = 3

  if (query.project) { sql += ` AND project = $${idx}`; p.push(query.project); idx++ }
  sql += ` ORDER BY created_at DESC LIMIT $${idx}`
  p.push(query.limit || 20)

  const rows = await queryAll(sql, p)
  return { messages: rows.map(rowToSummary) }
}

// ─── Thread ────────────────────────────────────────────────────

export async function getThread(userId: string, threadId: string) {
  const rows = await queryAll(
    `SELECT * FROM messages WHERE thread_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
    [threadId, userId]
  )
  return { messages: rows.map(rowToSummary) }
}

// ─── Helpers ───────────────────────────────────────────────────

function stripHtml(s: string): string {
  if (!s) return ''
  return s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function getPeriodDates(period: string) {
  const now = new Date()
  const end = now.toISOString()
  let start: Date
  switch (period) {
    case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); return { start: start.toISOString(), end, label: 'Today' }
    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); return { start: start.toISOString(), end, label: 'This month' }
    default: start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); return { start: start.toISOString(), end, label: 'Last 7 days' }
  }
}

function rowToSummary(row: Record<string, any>) {
  const payload = row.json_payload || {}
  const labels = typeof row.labels === 'string' ? JSON.parse(row.labels) : (row.labels || [])
  return {
    id: row.id, from: row.from_address, to: row.to_address, subject: row.subject,
    preview: stripHtml(row.content).slice(0, 120),
    date: row.created_at, type: payload.type || 'nmp:chat',
    status: row.direction === 'outbound' ? row.status : undefined,
    source: row.source || undefined, agent: row.agent || undefined,
    channel: row.channel_id || undefined, unread: !row.is_read,
    has_attachments: row.has_attachments, project: row.project || undefined, labels,
  }
}
