import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

function getClient() {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return null
  }
  return new NothingClient({ serverUrl: config.server_url, token: config.token })
}

export async function projects() {
  const client = getClient()
  if (!client) return

  try {
    const result = await client.projects()

    if (result.projects.length === 0) {
      console.log('\n  No projects. Create one with: nothing project:create <name>\n')
      return
    }

    console.log()
    console.log('  Project                 Threads  Messages  Unread')
    console.log('  ' + '─'.repeat(60))

    for (const p of result.projects) {
      const name = p.name.padEnd(24).slice(0, 24)
      const threads = String(p.thread_count || 0).padStart(7)
      const msgs = String(p.message_count || 0).padStart(9)
      const unread = String(p.unread || 0).padStart(6)
      console.log(`  ${name}  ${threads}  ${msgs}  ${unread}`)
    }
    console.log()
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message}`)
  }
}

export async function projectCreate(name: string, opts?: { description?: string }) {
  const client = getClient()
  if (!client) return

  try {
    const result = await client.createProject(name, opts?.description)
    console.log(`\n  ✓ Project "${result.name}" created (${result.id})\n`)
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message}`)
  }
}

export async function projectDelete(id: string, opts?: { yes?: boolean }) {
  const client = getClient()
  if (!client) return

  if (!opts?.yes) {
    const { confirm } = await import('@inquirer/prompts')
    const ok = await confirm({ message: `Delete project "${id}"? Messages will be untagged (not deleted).`, default: false })
    if (!ok) return
  }

  try {
    await client.deleteProject(id)
    console.log(`\n  ✓ Project deleted\n`)
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message}`)
  }
}
