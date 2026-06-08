import { execSync } from 'child_process'
import { platform } from 'os'

const CRON_COMMENT = '# nothing-mail-check'
const CRON_INTERVAL = '* * * * *' // every minute

export function installWatch(): boolean {
  const os = platform()

  if (os === 'win32') {
    // Windows: use schtasks
    try {
      const npmPath = execSync('where nothing', { encoding: 'utf-8' }).trim().split('\n')[0]
      execSync(
        `schtasks /create /tn "NothingMailCheck" /tr "${npmPath} check --silent" /sc minute /mo 1 /f`,
        { stdio: 'ignore' }
      )
      return true
    } catch {
      return false
    }
  }

  // macOS / Linux: use crontab
  try {
    let existing = ''
    try { existing = execSync('crontab -l 2>/dev/null', { encoding: 'utf-8' }) } catch {}

    // Already installed?
    if (existing.includes(CRON_COMMENT)) return true

    const nothingPath = execSync('which nothing 2>/dev/null || command -v nothing 2>/dev/null', { encoding: 'utf-8' }).trim()
    if (!nothingPath) return false

    const newCron = `${existing.trimEnd()}\n${CRON_INTERVAL} ${nothingPath} check --silent ${CRON_COMMENT}\n`
    execSync(`echo '${newCron}' | crontab -`, { encoding: 'utf-8' })
    return true
  } catch {
    return false
  }
}

export function uninstallWatch(): boolean {
  const os = platform()

  if (os === 'win32') {
    try {
      execSync('schtasks /delete /tn "NothingMailCheck" /f', { stdio: 'ignore' })
      return true
    } catch { return false }
  }

  try {
    let existing = ''
    try { existing = execSync('crontab -l 2>/dev/null', { encoding: 'utf-8' }) } catch {}
    if (!existing.includes(CRON_COMMENT)) return true

    const cleaned = existing.split('\n').filter(l => !l.includes(CRON_COMMENT)).join('\n')
    execSync(`echo '${cleaned}' | crontab -`, { encoding: 'utf-8' })
    return true
  } catch { return false }
}
