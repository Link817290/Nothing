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
  if (!config.token) {
    console.log('  Not logged in. Run "nothing init" or "nothing login <token>"')
    return
  }

  const client = new NothingClient(config as Required<Pick<typeof config, 'token' | 'api_host'>>)

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
    console.log('  #   From                    Subject                          Date           Channel')
    console.log('  ' + '─'.repeat(90))

    result.messages.forEach((msg, i) => {
      const unread = msg.unread ? '●' : '○'
      const from = (msg.from || '').padEnd(22).slice(0, 22)
      const subject = (msg.subject || '').padEnd(32).slice(0, 32)
      const date = timeAgo(msg.date).padEnd(14)
      const ch = (msg as any).channel?.name || ''
      console.log(`  ${unread} ${String(i + 1).padStart(2)}  ${from}  ${subject}  ${date}  ${ch}`)
    })

    console.log()
    console.log(`  Unread: ${result.total_unread}`)
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
