import { loadConfig, loadPid } from '../config.js'

export async function status() {
  const config = loadConfig()
  const pid = loadPid()
  const running = pid ? isRunning(pid) : false

  console.log('\n  Nothing Status\n')
  console.log(`  Initialized: ${config.initialized ? '✓' : '✗ (run "nothing init")'}`)
  console.log(`  Email:       ${config.email || '-'}`)
  console.log(`  Provider:    ${config.provider || '-'}`)
  console.log(`  Server:      ${running ? `✓ running (PID ${pid})` : '✗ stopped'}`)
  console.log(`  API:         ${config.api_host}`)
  console.log()
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
