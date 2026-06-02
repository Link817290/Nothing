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
  // One summary per day per thread per user — upsert by date
  const today = new Date().toISOString().slice(0, 10)
  const existing = await queryOne(
    `SELECT id FROM thread_summaries WHERE thread_id = $1 AND user_id = $2 AND created_at::date = $3::date`,
    [opts.threadId, opts.userId, today]
  )

  if (existing) {
    await run(
      `UPDATE thread_summaries SET summary = $1, period_start = $2, period_end = $3, message_ids = $4, message_count = $5, generated_by = $6, created_at = NOW()
       WHERE id = $7`,
      [opts.summary, opts.periodStart || null, opts.periodEnd || null,
       opts.messageIds ? JSON.stringify(opts.messageIds) : null,
       opts.messageIds?.length || 0,
       opts.generatedBy || 'manual',
       existing.id]
    )
    return { id: existing.id }
  }

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

/** Get messages for summary generation — only new messages since last summary */
export async function getMessagesForSummary(threadId: string, userId: string, messageIds?: string[]) {
  if (messageIds?.length) {
    return queryAll(
      `SELECT id, from_address, to_address, subject, content, direction, created_at
       FROM messages WHERE id = ANY($1) AND user_id = $2 ORDER BY created_at ASC`,
      [messageIds, userId]
    )
  }

  // Find the latest summary's period_end for this thread
  const lastSummary = await queryOne(
    `SELECT period_end, message_ids FROM thread_summaries
     WHERE thread_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [threadId, userId]
  )

  if (lastSummary?.period_end) {
    // Only messages after last summary
    const lastIds = lastSummary.message_ids ? (typeof lastSummary.message_ids === 'string' ? JSON.parse(lastSummary.message_ids) : lastSummary.message_ids) : []
    return queryAll(
      `SELECT id, from_address, to_address, subject, content, direction, created_at
       FROM messages WHERE thread_id = $1 AND user_id = $2 AND created_at > $3
       ORDER BY created_at ASC`,
      [threadId, userId, lastSummary.period_end]
    )
  }

  // No previous summary — get all messages
  return queryAll(
    `SELECT id, from_address, to_address, subject, content, direction, created_at
     FROM messages WHERE thread_id = $1 AND user_id = $2
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

/** Generate summary using DeepSeek API — non-streaming (for storage) */
export async function generateSummaryText(messages: any[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-cbcea3b46fff4fb1a122a8f38a4afd31'
  const prompt = buildSummaryPrompt(messages)

  if (apiKey) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: buildChatMessages(prompt),
          max_tokens: 512,
          temperature: 0.3,
        }),
      })

      if (res.ok) {
        const data = await res.json() as any
        const text = data.choices?.[0]?.message?.content?.trim()
        if (text) return text
      }
    } catch (err) {
      console.warn('[summary] DeepSeek API failed:', (err as Error).message)
    }
  }

  return fallbackSummary(messages)
}

/** Stream summary via DeepSeek — yields chunks for SSE */
export async function* streamSummaryText(messages: any[]): AsyncGenerator<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-cbcea3b46fff4fb1a122a8f38a4afd31'
  const prompt = buildSummaryPrompt(messages)

  if (!apiKey) {
    yield fallbackSummary(messages)
    return
  }

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: buildChatMessages(prompt),
        max_tokens: 512,
        temperature: 0.3,
        stream: true,
      }),
    })

    if (!res.ok || !res.body) {
      yield fallbackSummary(messages)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[summary] DeepSeek stream failed:', (err as Error).message)
    yield fallbackSummary(messages)
  }
}

function buildChatMessages(prompt: string) {
  return [
    { role: 'system', content: 'You are a concise thread summarizer. Summarize email threads focusing on key decisions, action items, and open questions. Use the same language as the messages. Keep it under 200 words.' },
    { role: 'user', content: prompt },
  ]
}

function fallbackSummary(messages: any[]): string {
  const participants = [...new Set(messages.map(m => m.from_address.split('@')[0]))]
  const subject = messages[0]?.subject || 'Thread'
  const points: string[] = []
  for (const m of messages) {
    const from = m.from_address.split('@')[0]
    const preview = m.content.replace(/## Message.*?## Content/s, '').trim().slice(0, 100)
    if (preview) points.push(`${from}: ${preview}`)
  }
  return [`**${subject}**`, `Participants: ${participants.join(', ')}`, `Messages: ${messages.length}`, '', ...points.slice(0, 8).map(p => `- ${p}`)].join('\n')
}
