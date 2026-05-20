import { confirm } from '@inquirer/prompts'
import { loadConfig, resetAll, loadPid, clearPid, paths } from '../config.js'

export async function reset() {
  const config = loadConfig()

  if (!config.initialized) {
    console.log('  Nothing is not initialized. Nothing to reset.')
    return
  }

  console.log(`\n  Current config: ${config.email} (${config.provider})`)
  console.log(`  This will delete:`)
  console.log(`    ${paths.config}`)
  console.log(`    ${paths.db}`)
  console.log()

  const ok = await confirm({ message: 'Are you sure? All local messages will be lost.', default: false })
  if (!ok) {
    console.log('  Cancelled.\n')
    return
  }

  // Stop server if running
  const pid = loadPid()
  if (pid) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {}
    clearPid()
  }

  resetAll()
  console.log('  ✓ Reset complete. Run "nothing init" to start fresh.\n')
}
