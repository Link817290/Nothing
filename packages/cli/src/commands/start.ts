import { loadConfig, savePid, loadPid, paths } from '../config.js'
import { spawn, exec } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

export async function start() {
  const config = loadConfig()

  // Check if already running
  const pid = loadPid()
  if (pid && isRunning(pid)) {
    console.log(`  Server already running (PID ${pid})`)
    console.log(`  ${config.api_host}`)
    return
  }

  console.log('  Starting Nothing server...')

  // Find server-process.js relative to this file
  const thisDir = dirname(fileURLToPath(import.meta.url))
  const serverScript = join(thisDir, 'server-process.js')

  const child = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      NOTHING_CONFIG: paths.config,
      NOTHING_DB: paths.db,
    },
    detached: true,
    stdio: 'ignore',
    cwd: join(thisDir, '..'),
  })

  child.unref()

  if (child.pid) {
    savePid(child.pid)

    // Wait a moment for server to start
    await new Promise(r => setTimeout(r, 2000))

    // Check if it's actually running
    if (isRunning(child.pid)) {
      console.log(`  ✓ Server started (PID ${child.pid})`)
      console.log(`  ${config.api_host}`)

      if (!config.initialized) {
        const setupUrl = `${config.api_host}/setup`
        console.log()
        console.log('  First time? Opening setup wizard...')
        console.log(`  → ${setupUrl}`)
        openBrowser(setupUrl)
      }
    } else {
      console.log('  ✗ Server crashed on startup. Run in foreground to see errors:')
      console.log('    npx tsx packages/cli/src/server-process.ts')
    }
  } else {
    console.log('  ✗ Failed to start server')
  }
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function openBrowser(url: string) {
  const cmd = process.platform === 'win32' ? `start ${url}`
    : process.platform === 'darwin' ? `open ${url}`
    : `xdg-open ${url}`
  exec(cmd, () => {})
}
