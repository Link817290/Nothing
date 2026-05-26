import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

export async function read(id: string) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const msg = await client.read(id)

    console.log()
    console.log(`  From:    ${msg.from}`)
    console.log(`  To:      ${msg.to}`)
    console.log(`  Date:    ${new Date(msg.date).toLocaleString()}`)
    console.log(`  Subject: ${msg.subject}`)
    if (msg.project) console.log(`  Project: ${msg.project}`)
    if (msg.labels?.length) console.log(`  Labels:  ${msg.labels.join(', ')}`)

    console.log()
    console.log(`  ${msg.content}`)

    if (msg.context) {
      console.log()
      if (msg.context.repo) console.log(`  Repo: ${msg.context.repo}`)
      if (msg.context.file) console.log(`  File: ${msg.context.file}`)
      if (msg.context.lines) console.log(`  Lines: ${msg.context.lines}`)
    }

    if (msg.attachments?.length) {
      console.log()
      console.log('  Attachments:')
      msg.attachments.forEach((att: any, i: number) => {
        console.log(`    [${i + 1}] ${att.filename} (${(att.size / 1024).toFixed(1)} KB)`)
      })
    }

    if (msg.thread && msg.thread.length > 1) {
      console.log()
      console.log('  Thread:')
      msg.thread.forEach((t: any) => {
        const marker = t.id === id ? '→' : ' '
        console.log(`  ${marker} ${t.from}: ${t.preview}`)
      })
    }

    console.log()
  } catch (err) {
    console.log(`  ✗ Failed: ${(err as Error).message}`)
  }
}
