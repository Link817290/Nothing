/**
 * Real-time email sync from Stalwart via JMAP EventSource (SSE).
 * Falls back to polling if EventSource fails.
 */
import { queryAll, queryOne, run } from '../repositories/db.js'
import { decrypt } from '../services/accounts.js'

const MAIL_URL = process.env.MAIL_ADMIN_URL || 'https://mail:443'

let pollTimer: ReturnType<typeof setInterval> | null = null
const activeListeners = new Map<string, AbortController>()

// ─── JMAP Helper ────────────────────────────────────────────────

async function jmapRequest(authUser: string, authPass: string, methodCalls: any[]): Promise<any> {
  const auth = Buffer.from(`${authUser}:${authPass}`).toString('base64')
  const res = await fetch(`${MAIL_URL}/jmap/`, {
    method: 'POST',
    redirect: 'follow',
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

  // Get JMAP session
  let accountId: string
  try {
    const sessionRes = await fetch(`${MAIL_URL}/.well-known/jmap`, {
      redirect: 'follow',
      headers: { 'Authorization': `Basic ${Buffer.from(`${authUser}:${password}`).toString('base64')}` },
    })
    if (!sessionRes.ok) return 0
    const session = await sessionRes.json()
    accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail']
    if (!accountId) return 0
  } catch {
    return 0
  }

  const res = await jmapRequest(authUser, password, [
    ['Email/query', {
      accountId,
      sort: [{ property: 'receivedAt', isAscending: false }],
      limit: 50,
    }, 'q1'],
    ['Email/get', {
      accountId,
      '#ids': { resultOf: 'q1', name: 'Email/query', path: '/ids' },
      properties: ['id', 'from', 'to', 'subject', 'receivedAt', 'preview', 'hasAttachment', 'bodyValues', 'textBody', 'htmlBody'],
      fetchTextBodyValues: true,
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

    const toAddr = email.to?.map((t: any) => t.email).join(', ') || acc.email
    const subject = email.subject || '(no subject)'

    let body = ''
    if (email.bodyValues) {
      const htmlPart = email.htmlBody?.[0]
      const textPart = email.textBody?.[0]
      if (htmlPart?.partId && email.bodyValues[htmlPart.partId]) {
        body = email.bodyValues[htmlPart.partId].value || ''
      } else if (textPart?.partId && email.bodyValues[textPart.partId]) {
        body = email.bodyValues[textPart.partId].value || ''
      }
    }
    if (!body) body = email.preview || subject
    if (body.length > 20000) body = body.slice(0, 20000)

    const isNmp = body.includes('## Message') && body.includes('## Content')
    const source = isNmp ? 'nmp' : 'external'

    await run(
      `INSERT INTO messages (id, user_id, account_id, from_address, to_address, subject, content, json_payload, agent, project, labels, channel_id, status, source, thread_id, direction, has_attachments, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'delivered', $13, $14, 'inbound', $15, FALSE)`,
      [msgId, acc.user_id, acc.id, fromAddr, toAddr, subject, body, null, null, null, '[]', 'stalwart', source, msgId, email.hasAttachment || false]
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
    const res = await fetch(url, {
      redirect: 'follow',
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
