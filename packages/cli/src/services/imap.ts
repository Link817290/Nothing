import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { loadConfig, decryptSecret } from '../config.js'
import { getDb, saveDb } from '../db.js'
import type { Database } from 'sql.js'

let polling = false
let pollTimer: ReturnType<typeof setInterval> | null = null

function queryOne(db: Database, sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params as any[])
  const result = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return result
}

async function createClient() {
  const config = loadConfig()
  if (!config.imap_host || !config.smtp_user || !config.smtp_pass) return null

  return new ImapFlow({
    host: config.imap_host,
    port: config.imap_port || 993,
    secure: true,
    auth: {
      user: config.smtp_user,
      pass: decryptSecret(config.smtp_pass),
    },
    logger: false,
  })
}

async function syncEmails() {
  if (polling) return
  polling = true

  try {
    const db = await getDb()
    const config = loadConfig()
    if (!config.imap_host) { polling = false; return }

    const client = await createClient()
    if (!client) { polling = false; return }

    let newCount = 0

    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX')

      try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        // First pass: get envelopes to find new messages
        const envelopes = client.fetch({ since }, {
          uid: true,
          envelope: true,
        }, { uid: true })

        const toFetch: number[] = []
        for await (const msg of envelopes) {
          if (toFetch.length >= 200) break
          const imapId = `imap_${msg.uid}`
          const existing = queryOne(db, `SELECT id FROM messages WHERE id = ?`, [imapId])
          if (existing) continue
          const fromAddr = msg.envelope?.from?.[0]?.address || ''
          if (fromAddr === config.email || fromAddr === config.smtp_user) continue
          toFetch.push(msg.uid)
        }

        // Second pass: download full source and parse with mailparser
        for (const uid of toFetch) {
          try {
            const { content } = await client.download(String(uid), undefined, { uid: true })
            if (!content) continue

            const chunks: Buffer[] = []
            for await (const chunk of content) chunks.push(chunk as Buffer)
            const raw = Buffer.concat(chunks)

            // Parse with mailparser — handles encoding, charset, multipart, everything
            const parsed = await simpleParser(raw)

            const imapId = `imap_${uid}`
            const from = parsed.from?.text || 'unknown'
            const to = parsed.to?.text || config.email || 'unknown'
            const subject = parsed.subject || '(no subject)'
            const date = parsed.date?.toISOString() || new Date().toISOString()

            // Detect NMP message: X-NMP-Version header or nmp.md attachment
            const nmpHeader = parsed.headers?.get('x-nmp-version')
            const nmpAttachment = parsed.attachments?.find(a => a.filename === 'nmp.md')
            const nmpJsonAttachment = parsed.attachments?.find(a => a.filename === 'nmp.json')
            const isNmp = !!(nmpHeader || nmpAttachment)

            // Extract body + NMP metadata
            let body: string
            let jsonPayload: string | null = null
            let agent: string | null = null
            let project: string | null = null
            let labels = '[]'

            if (isNmp && nmpAttachment) {
              // NMP message — use nmp.md as the primary content for Agent reading
              body = nmpAttachment.content.toString('utf-8')
              // Parse JSON payload if available
              if (nmpJsonAttachment) {
                try {
                  jsonPayload = nmpJsonAttachment.content.toString('utf-8')
                  const jp = JSON.parse(jsonPayload)
                  agent = jp.agent || null
                  project = jp.project || null
                  labels = JSON.stringify(jp.labels || [])
                } catch {}
              }
              // Also check header
              if (!agent) {
                const agentHeader = parsed.headers?.get('x-nmp-agent')
                if (agentHeader) agent = String(agentHeader)
              }
            } else {
              // Regular email — prefer HTML, fallback to text
              body = parsed.html || parsed.textAsHtml || parsed.text || subject
            }
            if (body.length > 20000) body = body.slice(0, 20000)

            const source = isNmp ? 'nmp' : 'external'

            db.run(
              `INSERT INTO messages (id, from_address, to_address, subject, content, json_payload, agent, project, labels, channel_id, status, source, thread_id, direction, has_attachments, is_read)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered', ?, ?, 'inbound', ?, 0)`,
              [imapId, from, to, subject, body, jsonPayload, agent, project, labels, config.provider || 'unknown', source, imapId, parsed.attachments?.filter(a => a.filename !== 'nmp.md' && a.filename !== 'nmp.json').length ? 1 : 0]
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
      console.error('[imap] Sync error:', (err as Error).message)
      try { await client.logout() } catch {}
    }

    if (newCount > 0) {
      saveDb()
      console.error(`[imap] Synced ${newCount} new emails`)
    }
  } catch (err) {
    console.error('[imap] Error:', (err as Error).message)
  }

  polling = false
}

export async function startImapPolling(intervalMs = 30000) {
  const config = loadConfig()
  if (!config.imap_host || !config.smtp_user) {
    console.error('[imap] No IMAP config, skipping')
    return
  }

  console.error('[imap] Starting polling, interval:', intervalMs / 1000, 's')
  await syncEmails()
  pollTimer = setInterval(syncEmails, intervalMs)
}

export function stopImapPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
