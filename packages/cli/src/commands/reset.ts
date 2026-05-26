import { confirm } from '@inquirer/prompts'
import { loadConfig, resetAll, paths } from '../config.js'

export async function reset() {
  const config = loadConfig()

  if (!config.initialized) {
    console.log('  Nothing is not initialized. Nothing to reset.')
    return
  }

  console.log(`\n  Current config: ${config.email} → ${config.server_url}`)

  const ok = await confirm({ message: 'Reset local config? (server data is not affected)', default: false })
  if (!ok) {
    console.log('  Cancelled.\n')
    return
  }

  resetAll()
  console.log('  ✓ Reset complete. Run "nothing init" to start fresh.\n')
}
