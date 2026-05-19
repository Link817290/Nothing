import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const NOTHING_DIR = join(homedir(), '.nothing')
const CONFIG_FILE = join(NOTHING_DIR, 'config.json')
const PID_FILE = join(NOTHING_DIR, 'server.pid')
const DB_FILE = join(NOTHING_DIR, 'data.db')

export interface NothingConfig {
  token?: string
  email?: string
  api_host: string
  provider?: string
  smtp_host?: string
  smtp_port?: number
  imap_host?: string
  imap_port?: number
  smtp_user?: string
  smtp_pass?: string
  initialized?: boolean
}

const DEFAULT_CONFIG: NothingConfig = {
  api_host: 'http://localhost:3000',
}

export function ensureDir() {
  if (!existsSync(NOTHING_DIR)) {
    mkdirSync(NOTHING_DIR, { recursive: true })
  }
}

export function loadConfig(): NothingConfig {
  ensureDir()
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: NothingConfig) {
  ensureDir()
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function savePid(pid: number) {
  ensureDir()
  writeFileSync(PID_FILE, String(pid))
}

export function loadPid(): number | null {
  if (!existsSync(PID_FILE)) return null
  try {
    return parseInt(readFileSync(PID_FILE, 'utf-8').trim())
  } catch {
    return null
  }
}

export function clearPid() {
  if (existsSync(PID_FILE)) {
    writeFileSync(PID_FILE, '')
  }
}

export const paths = {
  dir: NOTHING_DIR,
  config: CONFIG_FILE,
  pid: PID_FILE,
  db: DB_FILE,
}
