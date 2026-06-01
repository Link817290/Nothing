import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const NOTHING_DIR = join(homedir(), '.nothing')
const CONFIG_FILE = join(NOTHING_DIR, 'config.json')

export interface NothingConfig {
  server_url?: string     // e.g. https://api.nothing.email or http://localhost:3000
  token?: string          // JWT from server
  email?: string          // cached user email
  initialized?: boolean
}

const DEFAULT_CONFIG: NothingConfig = {}

export function ensureDir() {
  if (!existsSync(NOTHING_DIR)) mkdirSync(NOTHING_DIR, { recursive: true })
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

export function resetAll() {
  if (existsSync(CONFIG_FILE)) unlinkSync(CONFIG_FILE)
}

export const NOTIFICATIONS_FILE = join(NOTHING_DIR, 'notifications.json')

export function writeNotifications(messages: any[]) {
  ensureDir()
  writeFileSync(NOTIFICATIONS_FILE, JSON.stringify({
    updated_at: new Date().toISOString(),
    unread: messages.length,
    messages: messages.slice(0, 5).map(m => ({
      id: m.id, from: m.from, subject: m.subject, date: m.date, preview: m.preview,
    })),
  }, null, 2))
}

export function readNotifications(): { updated_at?: string; unread: number; messages: any[] } {
  if (!existsSync(NOTIFICATIONS_FILE)) return { unread: 0, messages: [] }
  try {
    return JSON.parse(readFileSync(NOTIFICATIONS_FILE, 'utf-8'))
  } catch { return { unread: 0, messages: [] } }
}

export function clearNotifications() {
  if (existsSync(NOTIFICATIONS_FILE)) unlinkSync(NOTIFICATIONS_FILE)
}

export const paths = {
  dir: NOTHING_DIR,
  config: CONFIG_FILE,
  notifications: NOTIFICATIONS_FILE,
}
