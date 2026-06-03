import { loadConfig, writeNotifications, readNotifications } from '../config.js'
import { NothingClient } from '../client.js'

export async function check(opts?: { silent?: boolean }) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) return

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const result = await client.inbox({ unread: true, limit: 5 })
    const unread = result.total_unread || 0
    const messages = result.messages || []

    // Check if there are new messages since last check
    const prev = readNotifications()
    const prevIds = new Set(prev.messages.map((m: any) => m.id))
    const newMessages = messages.filter((m: any) => !prevIds.has(m.id))

    writeNotifications(messages)

    // Desktop notification for new messages only
    if (newMessages.length > 0) {
      try {
        const notifier = await import('node-notifier')
        const title = newMessages.length === 1
          ? newMessages[0].from?.split('@')[0] || 'New message'
          : `${newMessages.length} new messages`
        const body = newMessages.length === 1
          ? newMessages[0].subject || '(no subject)'
          : newMessages.map((m: any) => `${m.from?.split('@')[0]}: ${m.subject || '(no subject)'}`).join('\n')
        notifier.default.notify({
          title: `Nothing — ${title}`,
          message: body,
          sound: true,
        })
      } catch {}
    }

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
