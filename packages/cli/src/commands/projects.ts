import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

export async function projects() {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const result = await client.projects()

    if (result.projects.length === 0) {
      console.log('\n  No projects yet\n')
      return
    }

    console.log()
    console.log('  Project                 Total   Unread  Last Activity')
    console.log('  ' + '─'.repeat(65))

    for (const p of result.projects) {
      const name = p.name.padEnd(24).slice(0, 24)
      const total = String(p.total).padStart(5)
      const unread = String(p.unread).padStart(6)
      const activity = timeAgo(p.last_activity)
      console.log(`  ${name}  ${total}  ${unread}  ${activity}`)
    }
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
  return new Date(date).toLocaleDateString()
}
