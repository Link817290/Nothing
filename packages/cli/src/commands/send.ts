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
  if (!config.token) {
    console.log('  Not logged in. Run "nothing init" or "nothing login <token>"')
    return
  }

  const client = new NothingClient(config as Required<Pick<typeof config, 'token' | 'api_host'>>)

  try {
    const result = await client.send({
      to,
      text,
      files: opts.file,
      project: opts.project,
      labels: opts.labels,
      priority: opts.priority as 'urgent' | 'normal' | 'low',
      require: opts.require,
    })
    console.log(`  ✓ Sent to ${to}`)
    console.log(`  Message-ID: ${result.message_id}`)
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}
