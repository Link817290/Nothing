import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { queryOne, queryAll, run } from '../repositories/db.js'
import { decrypt } from '../services/accounts.js'

let polling = false
let pollTimer: ReturnType<typeof setInterval> | null = null

async function syncAll(): Promise<number> {
  if (polling) return 0
  polling = true
  let total = 0

  try {
    const accounts = await queryAll('SELECT * FROM email_accounts WHERE is_active = TRUE')
    for (const acc of accounts) {
      try {
        total += await syncAccount(acc)
      } catch (err) {
        console.error(`[imap] Sync error for ${acc.email}:`, (err as Error).message)
      }
    }
  } catch (err) {
    console.error('[imap] Error:', (err as Error).message)
  }

  polling = false
  return total
}

async function syncAccount(acc: Record<string, any>): Promise<number> {
  const pass = decrypt(acc.auth_pass_encrypted)

  const client = new ImapFlow({
    host: acc.imap_host, port: acc.imap_port, secure: true,
    auth: { user: acc.auth_user, pass }, logger: false,
  })

  let newCount = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const envelopes = client.fetch({ since }, { uid: true, envelope: true }, { uid: true })
      const toFetch: number[] = []

      for await (const msg of envelopes) {
        if (toFetch.length >= 200) break
        const imapId = `imap_${acc.id}_${msg.uid}`
        const existing = await queryOne(`SELECT id FROM messages WHERE id = $1`, [imapId])
        if (existing) continue
        const fromAddr = msg.envelope?.from?.[0]?.address || ''
        if (fromAddr === acc.email || fromAddr === acc.auth_user) continue
        toFetch.push(msg.uid)
      }

      for (const uid of toFetch) {
        try {
          const { content } = await client.download(String(uid), undefined, { uid: true })
          if (!content) continue

          const chunks: Buffer[] = []
          for await (const chunk of content) chunks.push(chunk as Buffer)
          const raw = Buffer.concat(chunks)
          const parsed = await simpleParser(raw)

          const imapId = `imap_${acc.id}_${uid}`
          const from = parsed.from?.text || 'unknown'
          const to = parsed.to?.text || acc.email
          const subject = parsed.subject || '(no subject)'

          const nmpHeader = parsed.headers?.get('x-nmp-version')
          const nmpAttachment = parsed.attachments?.find(a => a.filename === 'nmp.md')
          const nmpJsonAttachment = parsed.attachments?.find(a => a.filename === 'nmp.json')
          const isNmp = !!(nmpHeader || nmpAttachment)

          let body: string
          let jsonPayload: any = null
          let agent: string | null = null
          let project: string | null = null
          let labels: string[] = []

          if (isNmp && nmpAttachment) {
            body = nmpAttachment.content.toString('utf-8')
            if (nmpJsonAttachment) {
              try {
                jsonPayload = JSON.parse(nmpJsonAttachment.content.toString('utf-8'))
                agent = jsonPayload.agent || null
                project = jsonPayload.project || null
                labels = jsonPayload.labels || []
              } catch {}
            }
            if (!agent) {
              const agentHeader = parsed.headers?.get('x-nmp-agent')
              if (agentHeader) agent = String(agentHeader)
            }
          } else {
            body = parsed.html || parsed.textAsHtml || parsed.text || subject
          }
          if (body.length > 20000) body = body.slice(0, 20000)

          const source = isNmp ? 'nmp' : 'external'
          const userAttachments = parsed.attachments?.filter(a => a.filename !== 'nmp.md' && a.filename !== 'nmp.json')

          await run(
            `INSERT INTO messages (id, user_id, account_id, from_address, to_address, subject, content, json_payload, agent, project, labels, channel_id, status, source, thread_id, direction, has_attachments, is_read)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'delivered', $13, $14, 'inbound', $15, FALSE)`,
            [imapId, acc.user_id, acc.id, from, to, subject, body, jsonPayload ? JSON.stringify(jsonPayload) : null, agent, project, JSON.stringify(labels), acc.provider, source, imapId, userAttachments?.length ? true : false]
          )
          newCount++
        } catch (err) {
          console.error(`[imap] Failed to parse uid ${uid}:`, (err as Error).message)
        }
      }
    } finally {
      lock.release()
    }

    await client.logout()
  } catch (err) {
    console.error(`[imap] Connection error for ${acc.email}:`, (err as Error).message)
    try { await client.logout() } catch {}
  }

  if (newCount > 0) {
    await run(`UPDATE email_accounts SET last_sync_at = NOW() WHERE id = $1`, [acc.id])
    console.log(`[imap] ${acc.email}: synced ${newCount} new emails`)
  }

  return newCount
}

/** Sync a single account by ID */
export async function syncAccountById(accountId: string): Promise<number> {
  const acc = await queryOne('SELECT * FROM email_accounts WHERE id = $1', [accountId])
  if (!acc) throw new Error('Account not found')
  return syncAccount(acc)
}

export async function startImapPolling(intervalMs = 30000) {
  console.log(`[imap] Starting polling, interval: ${intervalMs / 1000}s`)
  await syncAll()
  pollTimer = setInterval(syncAll, intervalMs)
}

export function stopImapPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}
