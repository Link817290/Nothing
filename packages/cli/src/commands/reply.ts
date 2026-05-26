import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

interface ReplyOptions {
  file?: string[]
}

export async function reply(id: string, text: string, opts: ReplyOptions) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const result = await client.reply(id, { text, files: opts.file })
    console.log(`  ✓ Reply sent`)
    console.log(`  Message-ID: ${result.message_id}`)
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}
