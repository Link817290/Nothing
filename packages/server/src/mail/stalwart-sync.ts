/**
 * Real-time email sync from Stalwart via JMAP EventSource (SSE).
 * Falls back to polling if EventSource fails.
 */
import { queryAll, queryOne, run } from '../repositories/db.js'
import { decrypt } from '../services/accounts.js'
import { parseNmpEmail } from '@nothingmail/nmp'

const MAIL_URL = process.env.MAIL_ADMIN_URL || 'http://mail:8080'

let pollTimer: ReturnType<typeof setInterval> | null = null
const activeListeners = new Map<string, AbortController>()

// ─── Fetch with retry ───────────────────────────────────────────

async function fetchRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, { ...init, redirect: 'follow' })
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, (i + 1) * 2000))
    }
  }
  throw new Error('fetchRetry exhausted')
}

// ─── JMAP Helpers ───────────────────────────────────────────────

async function jmapRequest(authUser: string, authPass: string, methodCalls: any[]): Promise<any> {
  const auth = Buffer.from(`${authUser}:${authPass}`).toString('base64')
  const res = await fetchRetry(`${MAIL_URL}/jmap/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

function getResult(response: any, callId: string): any {
  if (!response?.methodResponses) return null
  for (const [, result, id] of response.methodResponses) {
    if (id === callId) return result
  }
  return null
}

// ─── Fetch new emails for one account ───────────────────────────

async function fetchNewEmails(acc: Record<string, any>): Promise<number> {
  const password = decrypt(acc.auth_pass_encrypted)
  const authUser = acc.email
  const basicAuth = Buffer.from(`${authUser}:${password}`).toString('base64')

  // Get JMAP session (need accountId + download URL template)
  let accountId: string
  let downloadUrl: string
  try {
    const sessionRes = await fetchRetry(`${MAIL_URL}/.well-known/jmap`, {
      headers: { 'Authorization': `Basic ${basicAuth}` },
    })
    if (!sessionRes.ok) return 0
    const session = await sessionRes.json()
    accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail']
    downloadUrl = session.downloadUrl || ''
    if (!accountId) return 0
  } catch {
    return 0
  }

  // Query recent emails — get IDs + blobId for raw download
  const res = await jmapRequest(authUser, password, [
    ['Email/query', {
      accountId,
      sort: [{ property: 'receivedAt', isAscending: false }],
      limit: 50,
    }, 'q1'],
    ['Email/get', {
      accountId,
      '#ids': { resultOf: 'q1', name: 'Email/query', path: '/ids' },
      properties: ['id', 'blobId', 'from', 'to', 'subject', 'receivedAt', 'preview', 'hasAttachment', 'size'],
    }, 'g1'],
  ])

  if (!res) return 0
  const emails = getResult(res, 'g1')?.list || []

  let newCount = 0
  for (const email of emails) {
    const msgId = `stalwart_${acc.id}_${email.id}`
    const existing = await queryOne('SELECT id FROM messages WHERE id = $1', [msgId])
    if (existing) continue

    const fromAddr = email.from?.[0]?.email || ''
    if (fromAddr === acc.email) continue

    // Skip oversized emails (10MB limit)
    if (email.size && email.size > 10 * 1024 * 1024) continue

    const toAddr = email.to?.map((t: any) => t.email).join(', ') || acc.email
    const subject = email.subject || '(no subject)'

    // Download raw MIME and parse with NMP parser
    let body = ''
    let jsonPayload: any = null
    let agent: string | null = null
    let project: string | null = null
    let labels: string[] = []
    let source = 'external'
    let hasUserAttachments = false
    let parsedEmail: any = null

    if (email.blobId && downloadUrl) {
      try {
        const rawUrl = downloadUrl
          .replace('{accountId}', accountId)
          .replace('{blobId}', email.blobId)
          .replace('{name}', 'email.eml')
          .replace('{type}', 'application/octet-stream')
        // Rewrite URL to use MAIL_URL (downloadUrl uses container hostname which is unreachable)
        let finalUrl: string
        try {
          const parsed = new URL(rawUrl)
          finalUrl = `${MAIL_URL}${parsed.pathname}${parsed.search}`
        } catch {
          finalUrl = `${MAIL_URL}${rawUrl}`
        }

        const rawRes = await fetchRetry(finalUrl, {
          headers: { 'Authorization': `Basic ${basicAuth}` },
        })

        if (rawRes.ok) {
          const rawBuffer = Buffer.from(await rawRes.arrayBuffer())
          const { simpleParser } = await import('mailparser')
          const parsed = await simpleParser(rawBuffer)
          parsedEmail = parsed

          // Skip auto-submitted messages (RFC 3834)
          const autoSubmitted = parsed.headers?.get('auto-submitted')
          if (autoSubmitted && String(autoSubmitted) !== 'no') continue

          // Parse NMP
          const nmpResult = parseNmpEmail({
            from: parsed.from?.text,
            to: parsed.to?.text,
            subject: parsed.subject,
            date: parsed.date,
            messageId: parsed.messageId,
            headers: parsed.headers as any,
            text: parsed.text,
            html: parsed.html,
            textAsHtml: parsed.textAsHtml,
            attachments: parsed.attachments?.map(a => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
              size: a.size,
            })),
          })

          if (nmpResult.isNmp && nmpResult.message) {
            source = 'nmp'
            body = nmpResult.message.content
            jsonPayload = nmpResult.payload
            agent = nmpResult.payload?.agent || null
            project = nmpResult.payload?.project || null
            labels = nmpResult.payload?.labels || []
          } else {
            body = parsed.html || parsed.textAsHtml || parsed.text || email.preview || subject
          }

          // Save user attachments (exclude nmp.md/nmp.json)
          const rawAttachments = (parsed.attachments || [])
            .filter(a => a.filename && a.filename !== 'nmp.md' && a.filename !== 'nmp.json')

          if (rawAttachments.length > 0) {
            hasUserAttachments = true
            try {
              const { saveAttachment } = await import('../services/attachments.js')
              for (const att of rawAttachments) {
                await saveAttachment(msgId, att.filename!, att.contentType || 'application/octet-stream', att.content)
              }
            } catch (e) {
              console.warn(`[stalwart-sync] Failed to save attachments for ${msgId}:`, (e as Error).message)
            }
          }
        }
      } catch (e) {
        // Fallback: use preview if raw download fails
        console.warn(`[stalwart-sync] Raw download failed for ${email.id}, using preview`)
      }
    }

    // Fallback body from preview
    if (!body) body = email.preview || subject
    if (body.length > 20000) body = body.slice(0, 20000)

    // Thread matching: find parent message by In-Reply-To or References
    let threadId = msgId
    let inReplyTo: string | null = null
    let smtpMessageId: string | null = null

    if (parsedEmail) {
      smtpMessageId = parsedEmail.messageId || null
      const replyTo = parsedEmail.inReplyTo
      const refs = parsedEmail.references

      // Try to find parent by SMTP Message-ID
      const refIds = [
        ...(replyTo ? [typeof replyTo === 'string' ? replyTo : ''] : []),
        ...(Array.isArray(refs) ? refs : refs ? [refs] : []),
      ].filter(Boolean)

      for (const refId of refIds) {
        const parent = await queryOne(
          `SELECT id, thread_id FROM messages WHERE smtp_message_id = $1 AND user_id = $2`,
          [refId, acc.user_id]
        )
        if (parent) {
          threadId = parent.thread_id || parent.id
          inReplyTo = parent.id
          break
        }
      }
    }

    await run(
      `INSERT INTO messages (id, user_id, account_id, from_address, to_address, subject, content, json_payload, agent, project, labels, channel_id, status, source, thread_id, in_reply_to, smtp_message_id, direction, has_attachments, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'delivered', $13, $14, $15, $16, 'inbound', $17, FALSE)`,
      [msgId, acc.user_id, acc.id, fromAddr, toAddr, subject, body,
       jsonPayload ? JSON.stringify(jsonPayload) : null,
       agent, project, JSON.stringify(labels),
       'stalwart', source, threadId, inReplyTo, smtpMessageId,
       hasUserAttachments || email.hasAttachment || false]
    )
    newCount++
  }

  if (newCount > 0) {
    await run('UPDATE email_accounts SET last_sync_at = NOW() WHERE id = $1', [acc.id])
    console.log(`[stalwart-sync] ${acc.email}: ${newCount} new emails`)
  }

  return newCount
}

// ─── EventSource listener (real-time push) ──────────────────────

async function startEventSource(acc: Record<string, any>): Promise<boolean> {
  const password = decrypt(acc.auth_pass_encrypted)
  const authUser = acc.email
  const auth = Buffer.from(`${authUser}:${password}`).toString('base64')

  const controller = new AbortController()
  const url = `${MAIL_URL}/jmap/eventsource/?types=*&closeafter=no&ping=30`

  try {
    const res = await fetchRetry(url, {
      headers: { 'Authorization': `Basic ${auth}` },
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      return false
    }

    activeListeners.set(acc.id, controller)
    console.log(`[stalwart-sync] EventSource connected for ${acc.email}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    // Read SSE stream in background
    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          if (text.includes('data:') && (text.includes('Email') || text.includes('state'))) {
            await fetchNewEmails(acc)
          }
        }
      } catch {
        // Disconnected
      } finally {
        activeListeners.delete(acc.id)
        if (!controller.signal.aborted) {
          console.log(`[stalwart-sync] EventSource disconnected for ${acc.email}, will reconnect`)
        }
      }
    })()

    return true
  } catch {
    return false
  }
}

// ─── Main sync loop ─────────────────────────────────────────────

async function syncAll() {
  const accounts = await queryAll(
    "SELECT * FROM email_accounts WHERE provider = 'stalwart' AND is_active = TRUE"
  )

  for (const acc of accounts) {
    if (activeListeners.has(acc.id)) continue

    try {
      const ok = await startEventSource(acc)
      if (!ok) {
        await fetchNewEmails(acc)
      }
    } catch (err) {
      console.error(`[stalwart-sync] Error for ${acc.email}:`, (err as Error).message)
    }
  }
}

export async function startStalwartPolling(intervalMs = 15000) {
  console.log(`[stalwart-sync] Starting (EventSource real-time + polling fallback)`)
  try {
    await syncAll()
  } catch (err) {
    console.error('[stalwart-sync] Initial sync failed (will retry):', (err as Error).message)
  }
  pollTimer = setInterval(() => {
    syncAll().catch(err => {
      console.error('[stalwart-sync] Poll error:', (err as Error).message)
    })
  }, intervalMs)
}

export function stopStalwartPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  for (const [, controller] of activeListeners) {
    controller.abort()
  }
  activeListeners.clear()
}
