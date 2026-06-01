import { randomBytes } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'

function genId() {
  return `sum_${randomBytes(8).toString('base64url')}`
}

const MIN_MESSAGES_FOR_AUTO = 5

// ─── CRUD ─────────────────────────────────────────────────────

export async function createSummary(opts: {
  threadId: string; userId: string; summary: string;
  periodStart?: string; periodEnd?: string;
  messageIds?: string[]; generatedBy?: string;
}) {
  const id = genId()
  await run(
    `INSERT INTO thread_summaries (id, thread_id, user_id, summary, period_start, period_end, message_ids, message_count, generated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, opts.threadId, opts.userId, opts.summary,
     opts.periodStart || null, opts.periodEnd || null,
     opts.messageIds ? JSON.stringify(opts.messageIds) : null,
     opts.messageIds?.length || 0,
     opts.generatedBy || 'manual']
  )
  return { id }
}

export async function listSummaries(threadId: string, userId: string) {
  return queryAll(
    'SELECT * FROM thread_summaries WHERE thread_id = $1 AND user_id = $2 ORDER BY created_at DESC',
    [threadId, userId]
  )
}

export async function getSummary(id: string, userId: string) {
  return queryOne(
    'SELECT * FROM thread_summaries WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
}

// ─── Auto Summary (cron) ──────────────────────────────────────

/** Get threads that need daily summary (>= 5 messages, active today, no summary today) */
export async function getThreadsNeedingSummary(): Promise<{ thread_id: string; user_id: string; message_count: number }[]> {
  const rows = await queryAll(`
    SELECT m.thread_id, m.user_id, COUNT(*) as msg_count
    FROM messages m
    WHERE m.thread_id IS NOT NULL
    GROUP BY m.thread_id, m.user_id
    HAVING COUNT(*) >= $1
      AND MAX(m.created_at) >= NOW() - interval '1 day'
      AND m.thread_id NOT IN (
        SELECT ts.thread_id FROM thread_summaries ts
        WHERE ts.user_id = m.user_id AND ts.created_at >= NOW() - interval '1 day'
      )
  `, [MIN_MESSAGES_FOR_AUTO])

  return rows.map(r => ({
    thread_id: r.thread_id,
    user_id: r.user_id,
    message_count: parseInt(r.msg_count),
  }))
}

/** Get messages for summary generation */
export async function getMessagesForSummary(threadId: string, userId: string, messageIds?: string[]) {
  if (messageIds?.length) {
    return queryAll(
      `SELECT id, from_address, to_address, subject, content, direction, created_at
       FROM messages WHERE id = ANY($1) AND user_id = $2 ORDER BY created_at ASC`,
      [messageIds, userId]
    )
  }
  // Default: today's messages
  return queryAll(
    `SELECT id, from_address, to_address, subject, content, direction, created_at
     FROM messages WHERE thread_id = $1 AND user_id = $2 AND created_at >= NOW() - interval '1 day'
     ORDER BY created_at ASC`,
    [threadId, userId]
  )
}

/** Build prompt for AI summary */
export function buildSummaryPrompt(messages: any[]): string {
  const lines = messages.map(m => {
    const from = m.from_address.split('@')[0]
    const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const dir = m.direction === 'outbound' ? '→' : '←'
    const content = m.content.slice(0, 300)
    return `[${time}] ${from} ${dir}: ${content}`
  }).join('\n')

  return `Summarize this email thread concisely. Focus on key decisions, action items, and open questions. Keep it under 200 words.\n\n${lines}`
}

/** Placeholder: generate summary text. Replace with actual LLM call. */
export async function generateSummaryText(messages: any[]): Promise<string> {
  // TODO: Replace with actual LLM API call (OpenAI, Claude, etc.)
  // For now, generate a structured summary from the messages
  const participants = [...new Set(messages.map(m => m.from_address.split('@')[0]))]
  const topics = messages.map(m => m.subject).filter(Boolean)
  const subject = topics[0] || 'Thread discussion'

  const points: string[] = []
  for (const m of messages) {
    const from = m.from_address.split('@')[0]
    const preview = m.content.replace(/## Message.*?## Content/s, '').trim().slice(0, 100)
    if (preview) points.push(`${from}: ${preview}`)
  }

  return [
    `**${subject}**`,
    `Participants: ${participants.join(', ')}`,
    `Messages: ${messages.length}`,
    '',
    ...points.slice(0, 8).map(p => `- ${p}`),
  ].join('\n')
}
