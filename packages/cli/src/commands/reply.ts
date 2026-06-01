import { readFileSync, existsSync } from 'fs'
import { basename } from 'path'
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

  // Read files and encode as base64
  let attachments: { filename: string; content: string; content_type?: string }[] | undefined
  if (opts.file?.length) {
    attachments = []
    for (const filePath of opts.file) {
      if (!existsSync(filePath)) {
        console.log(`  ✗ File not found: ${filePath}`)
        return
      }
      const content = readFileSync(filePath)
      attachments.push({
        filename: basename(filePath),
        content: content.toString('base64'),
      })
    }
  }

  try {
    const result = await client.reply(id, { text, attachments })
    console.log(`  ✓ Reply sent`)
    if (attachments?.length) console.log(`  Attachments: ${attachments.map(a => a.filename).join(', ')}`)
    console.log(`  Message-ID: ${result.message_id}`)
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}
