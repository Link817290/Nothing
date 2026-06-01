import { loadConfig, writeNotifications } from '../config.js'
import { NothingClient } from '../client.js'

export async function check(opts?: { silent?: boolean }) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) return

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const result = await client.inbox({ unread: true, limit: 5 })
    const unread = result.total_unread || 0
    const messages = result.messages || []

    writeNotifications(messages)

    if (!opts?.silent) {
      if (unread === 0) {
        console.log('  No new messages.')
      } else {
        console.log(`\n  📬 ${unread} unread message${unread > 1 ? 's' : ''}:\n`)
        for (const m of messages) {
          console.log(`  ${m.from?.split('@')[0]}: ${m.subject || '(no subject)'}`)
        }
        console.log()
      }
    }
  } catch {}
}
