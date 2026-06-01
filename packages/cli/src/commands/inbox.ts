import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

interface InboxOptions {
  project?: string
  label?: string
  channel?: string
  source?: string
  agent?: string
  all?: boolean
  limit?: string
}

export async function inbox(opts: InboxOptions) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const result = await client.inbox({
      unread: !opts.all,
      project: opts.project,
      label: opts.label,
      channel: opts.channel,
      source: opts.source,
      agent: opts.agent,
      limit: opts.limit ? parseInt(opts.limit) : undefined,
    })

    if (result.messages.length === 0) {
      console.log(opts.all ? '\n  No messages yet\n' : '\n  All caught up\n')
      return
    }

    console.log()
    result.messages.forEach((msg: any) => {
      const unread = msg.unread ? '●' : '○'
      const from = (msg.from || '').split('@')[0].padEnd(16).slice(0, 16)
      const subject = (msg.subject || '(no subject)').padEnd(30).slice(0, 30)
      const date = timeAgo(msg.date)
      console.log(`  ${unread} ${msg.id}  ${from}  ${subject}  ${date}`)
    })

    console.log()
    console.log(`  Unread: ${result.total_unread}  |  Use: nothing read <id>`)
    console.log()
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'yesterday'
  return new Date(date).toLocaleDateString()
}
