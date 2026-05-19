import { loadPid, clearPid } from '../config.js'

export async function stop() {
  const pid = loadPid()

  if (!pid) {
    console.log('  Server is not running')
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
    clearPid()
    console.log(`  ✓ Server stopped (PID ${pid})`)
  } catch {
    clearPid()
    console.log('  Server was not running (stale PID cleared)')
  }
}
