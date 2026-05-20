import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, rmSync } from 'fs'
import { join } from 'path'
import { homedir, hostname, userInfo } from 'os'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

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

/** Reset all Nothing data — config, database, PID */
export function resetAll() {
  if (existsSync(CONFIG_FILE)) unlinkSync(CONFIG_FILE)
  if (existsSync(DB_FILE)) unlinkSync(DB_FILE)
  if (existsSync(PID_FILE)) unlinkSync(PID_FILE)
}

// ─── Secret encryption ─────────────────────────────────────────
// Simple AES-256-GCM encryption using a machine-bound key.
// Not bulletproof — but keeps passwords out of plaintext config.

const ENC_PREFIX = 'enc:'

/** Derive a machine-bound key from hostname + username + homedir */
function deriveKey(): Buffer {
  const material = `nothing:${hostname()}:${userInfo().username}:${homedir()}`
  return createHash('sha256').update(material).digest()
}

/** Encrypt a secret. Returns "enc:<iv>:<authTag>:<ciphertext>" */
export function encryptSecret(plain: string): string {
  const key = deriveKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${ENC_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

/** Decrypt a secret. If not encrypted (legacy), returns as-is. */
export function decryptSecret(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value // legacy plaintext
  const parts = value.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) return value
  const [ivB64, tagB64, dataB64] = parts
  const key = deriveKey()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return decipher.update(Buffer.from(dataB64, 'base64'), undefined, 'utf-8') + decipher.final('utf-8')
}

export const paths = {
  dir: NOTHING_DIR,
  config: CONFIG_FILE,
  pid: PID_FILE,
  db: DB_FILE,
}
