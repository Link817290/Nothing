import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'
import type { AddAccountRequest, EmailAccount } from '../types/index.js'

const PROVIDERS: Record<string, { smtp_host: string; smtp_port: number; imap_host: string; imap_port: number }> = {
  gmail:   { smtp_host: 'smtp.gmail.com',      smtp_port: 465, imap_host: 'imap.gmail.com',       imap_port: 993 },
  outlook: { smtp_host: 'smtp.office365.com',   smtp_port: 587, imap_host: 'outlook.office365.com', imap_port: 993 },
  qq:      { smtp_host: 'smtp.qq.com',          smtp_port: 465, imap_host: 'imap.qq.com',          imap_port: 993 },
  '163':   { smtp_host: 'smtp.163.com',         smtp_port: 465, imap_host: 'imap.163.com',         imap_port: 993 },
}

function genId() {
  return `acc_${randomBytes(8).toString('base64url')}`
}

// ─── Encryption ────────────────────────────────────────────────

const ENC_PREFIX = 'enc:'

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPT_KEY
  if (!secret) throw new Error('ENCRYPT_KEY environment variable is required')
  return createHash('sha256').update(secret).digest()
}

function encrypt(plain: string): string {
  const key = deriveKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${ENC_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decrypt(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value
  const parts = value.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) return value
  const [ivB64, tagB64, dataB64] = parts
  const key = deriveKey()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return decipher.update(Buffer.from(dataB64, 'base64'), undefined, 'utf-8') + decipher.final('utf-8')
}

// ─── Account CRUD ──────────────────────────────────────────────

export async function addAccount(userId: string, req: AddAccountRequest): Promise<EmailAccount> {
  const preset = PROVIDERS[req.provider]
  const smtpHost = req.smtp_host || preset?.smtp_host
  const smtpPort = req.smtp_port || preset?.smtp_port || 465
  const imapHost = req.imap_host || preset?.imap_host
  const imapPort = req.imap_port || preset?.imap_port || 993

  if (!smtpHost || !imapHost) throw new Error('SMTP/IMAP host required for custom provider')

  await testConnection(smtpHost, smtpPort, imapHost, imapPort, req.email, req.password)

  const id = genId()
  const encPass = encrypt(req.password)

  await run(
    `INSERT INTO email_accounts (id, user_id, provider, email, smtp_host, smtp_port, imap_host, imap_port, auth_user, auth_pass_encrypted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, userId, req.provider, req.email, smtpHost, smtpPort, imapHost, imapPort, req.email, encPass]
  )

  return (await getAccountById(id))!
}

/** Internal: add account without connection test (for auto-provisioning) */
export async function addAccountInternal(userId: string, opts: {
  provider: string; email: string;
  smtp_host: string; smtp_port: number;
  imap_host: string; imap_port: number;
  auth_user: string; auth_pass: string;
}): Promise<EmailAccount> {
  const id = genId()
  const encPass = encrypt(opts.auth_pass)

  await run(
    `INSERT INTO email_accounts (id, user_id, provider, email, smtp_host, smtp_port, imap_host, imap_port, auth_user, auth_pass_encrypted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, userId, opts.provider, opts.email, opts.smtp_host, opts.smtp_port, opts.imap_host, opts.imap_port, opts.auth_user, encPass]
  )

  return (await getAccountById(id))!
}

export async function listAccounts(userId: string): Promise<EmailAccount[]> {
  const rows = await queryAll('SELECT * FROM email_accounts WHERE user_id = $1 ORDER BY created_at', [userId])
  return rows.map(rowToAccount)
}

export async function getAccountById(id: string): Promise<EmailAccount | null> {
  const row = await queryOne('SELECT * FROM email_accounts WHERE id = $1', [id])
  return row ? rowToAccount(row) : null
}

export async function getUserAccount(userId: string, accountId: string): Promise<EmailAccount | null> {
  const row = await queryOne('SELECT * FROM email_accounts WHERE id = $1 AND user_id = $2', [accountId, userId])
  return row ? rowToAccount(row) : null
}

export async function removeAccount(userId: string, accountId: string): Promise<boolean> {
  const existing = await queryOne('SELECT id FROM email_accounts WHERE id = $1 AND user_id = $2', [accountId, userId])
  if (!existing) return false
  await run('DELETE FROM email_accounts WHERE id = $1', [accountId])
  return true
}

export async function getFirstAccount(userId: string): Promise<EmailAccount | null> {
  const row = await queryOne('SELECT * FROM email_accounts WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at LIMIT 1', [userId])
  return row ? rowToAccount(row) : null
}

// ─── Connection test ───────────────────────────────────────────

async function testConnection(smtpHost: string, smtpPort: number, imapHost: string, imapPort: number, email: string, pass: string) {
  try {
    const { createTransport } = await import('nodemailer')
    const t = createTransport({
      host: smtpHost, port: smtpPort, secure: smtpPort === 465,
      auth: { user: email, pass }, connectionTimeout: 10000,
    })
    await t.verify()
    t.close()
  } catch (e) {
    throw new Error(`SMTP connection failed: ${(e as Error).message}`)
  }

  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({
      host: imapHost, port: imapPort, secure: true,
      auth: { user: email, pass }, logger: false,
    })
    await client.connect()
    await client.logout()
  } catch (e) {
    throw new Error(`IMAP connection failed: ${(e as Error).message}`)
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function rowToAccount(row: Record<string, any>): EmailAccount {
  return {
    id: row.id, user_id: row.user_id, provider: row.provider, email: row.email,
    smtp_host: row.smtp_host, smtp_port: row.smtp_port,
    imap_host: row.imap_host, imap_port: row.imap_port,
    auth_user: row.auth_user, auth_pass_encrypted: row.auth_pass_encrypted,
    is_active: row.is_active, last_sync_at: row.last_sync_at || undefined,
    created_at: row.created_at,
  }
}
