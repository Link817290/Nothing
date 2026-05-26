import { loadConfig } from '../config.js'

export async function status() {
  const config = loadConfig()

  console.log('\n  Nothing Status\n')
  console.log(`  Initialized: ${config.initialized ? '✓' : '✗ (run "nothing init")'}`)
  console.log(`  Email:       ${config.email || '-'}`)
  console.log(`  Server:      ${config.server_url || '-'}`)
  console.log()
}
