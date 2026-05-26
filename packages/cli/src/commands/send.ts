import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

interface SendOptions {
  file?: string[]
  project?: string
  labels?: string[]
  priority?: string
  require?: string[]
}

export async function send(to: string, text: string, opts: SendOptions) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const result = await client.send({
      to, text,
      files: opts.file,
      project: opts.project,
      labels: opts.labels,
      priority: opts.priority,
      require: opts.require,
    })
    console.log(`  ✓ Sent to ${to}`)
    console.log(`  Message-ID: ${result.message_id}`)
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}
