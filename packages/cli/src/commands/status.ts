import { loadConfig, readNotifications } from '../config.js'
import { NothingClient } from '../client.js'
import { platform } from 'os'
import { execSync } from 'child_process'

export async function status() {
  const config = loadConfig()

  // Config
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  ✗ Not initialized. Run "nothing init" first.\n')
    return
  }
  console.log(`\n  Account: ${config.email || '?'}`)
  console.log(`  Server:  ${config.server_url}`)

  // Server health
  try {
    const res = await fetch(`${config.server_url}/health`, { signal: AbortSignal.timeout(5000) })
    console.log(`  Health:  ${res.ok ? '✓ OK' : '✗ ' + res.status}`)
  } catch {
    console.log(`  Health:  ✗ Unreachable`)
  }

  // Auth check
  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
  try {
    await client.inbox({ limit: 1 })
    console.log(`  Auth:    ✓ Valid`)
  } catch {
    console.log(`  Auth:    ✗ Invalid token`)
  }

  // Notifications
  const notif = readNotifications()
  console.log(`  Unread:  ${notif.unread || 0}${notif.updated_at ? ' (last check: ' + timeAgo(notif.updated_at) + ')' : ''}`)

  // Watch task
  const watchStatus = checkWatch()
  console.log(`  Watch:   ${watchStatus}`)

  console.log()
}

function checkWatch(): string {
  const os = platform()

  if (os === 'win32') {
    try {
      const result = execSync(
        'powershell -Command "(Get-ScheduledTask -TaskName \'NothingMailCheck\' -ErrorAction SilentlyContinue).State"',
        { encoding: 'utf-8', timeout: 5000 }
      ).trim()
      if (result === 'Ready') return '✓ Running (every 1 min)'
      if (result === 'Disabled') return '⚠ Disabled'
      if (!result) return '✗ Not installed'
      return `⚠ ${result}`
    } catch {
      return '✗ Not installed'
    }
  }

  // macOS / Linux: check crontab
  try {
    const crontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf-8' })
    if (crontab.includes('nothing-mail-check')) return '✓ Running (cron)'
    return '✗ Not installed'
  } catch {
    return '✗ Not installed'
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch { return iso }
}
