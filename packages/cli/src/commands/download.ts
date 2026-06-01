import { writeFileSync } from 'fs'
import { join } from 'path'
import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

export async function download(attachmentId: string, outputDir?: string) {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  try {
    const { filename, data } = await client.downloadAttachment(attachmentId)
    const outPath = join(outputDir || '.', filename)
    writeFileSync(outPath, data)
    console.log(`\n  ✓ Saved: ${outPath} (${(data.length / 1024).toFixed(1)} KB)\n`)
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message}\n`)
  }
}
