import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

interface ReplyOptions {
  file?: string[]
}

export async function reply(id: string, text: string, opts: ReplyOptions) {
  const config = loadConfig()
  if (!config.token) {
    console.log('  Not logged in. Run "nothing init" or "nothing login <token>"')
    return
  }

  const client = new NothingClient(config as Required<Pick<typeof config, 'token' | 'api_host'>>)

  try {
    const result = await client.reply(id, { text, files: opts.file })
    console.log(`  ✓ Reply sent`)
    console.log(`  Message-ID: ${result.message_id}`)
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}
