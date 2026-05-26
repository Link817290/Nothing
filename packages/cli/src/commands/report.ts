import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

interface ReportOptions {
  today?: boolean
  month?: boolean
  project?: string
}

export async function report(opts: ReportOptions) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
  const period = opts.today ? 'today' : opts.month ? 'month' : 'week'

  try {
    const r = await client.report({ period, project: opts.project })

    console.log()
    console.log(`  Report — ${r.period.label}`)
    console.log('  ' + '─'.repeat(50))

    console.log()
    console.log(`  Sent: ${r.summary.sent}   Received: ${r.summary.received}   Replied: ${r.summary.replied}   Failed: ${r.summary.failed}`)

    if (r.projects.length > 0) {
      console.log()
      console.log('  Projects:')
      for (const p of r.projects) {
        console.log(`    ${p.name.padEnd(24)} ${p.messages} msgs, ${p.threads} threads, ${p.resolved} resolved`)
      }
    }

    if (r.needs_reply.length > 0) {
      console.log()
      console.log('  Needs your reply:')
      for (const m of r.needs_reply) {
        const proj = m.project ? ` [${m.project}]` : ''
        console.log(`    ${m.from}: ${m.subject}${proj}`)
      }
    }

    if (r.top_threads.length > 0) {
      console.log()
      console.log('  Top threads:')
      for (const t of r.top_threads) {
        const icon = t.status === 'replied' ? '✓' : '○'
        console.log(`    ${icon} ${t.subject} (${t.message_count} msgs, ${t.status})`)
      }
    }

    console.log()
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}
