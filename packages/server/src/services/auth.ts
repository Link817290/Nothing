import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { queryOne, queryAll, run } from '../repositories/db.js'
import type { User } from '../types/index.js'

function genId() {
  return `usr_${randomBytes(8).toString('base64url')}`
}

function rowToUser(row: Record<string, any>): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    external_email: row.external_email || undefined,
    password_hash: row.password_hash,
    name: row.name || undefined,
    is_admin: row.is_admin,
    is_banned: row.is_banned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Get the mail domain (from Stalwart or MAIL_DOMAIN env) */
async function getMailDomain(): Promise<string | null> {
  // Try env var first
  const envDomain = process.env.MAIL_DOMAIN
  if (envDomain) return envDomain

  // Try Stalwart
  try {
    const { listDomains, mailEngineHealthy } = await import('./mailengine.js')
    if (await mailEngineHealthy()) {
      const domains = await listDomains()
      if (domains?.length > 0) return domains[0].name
    }
  } catch {}
  return null
}

/** Register first user (admin) — no verification needed */
export async function register(opts: {
  username: string; password: string; name?: string
}): Promise<User> {
  const setting = await queryOne("SELECT value FROM server_settings WHERE key = 'open_registration'")
  if (setting && setting.value === 'false') throw new Error('Registration is closed')

  const username = opts.username.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  if (username.length < 2) throw new Error('Username must be at least 2 characters')

  const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username])
  if (existing) throw new Error('Username already taken')

  const domain = await getMailDomain()
  const email = domain ? `${username}@${domain}` : username

  const id = genId()
  const hash = await bcrypt.hash(opts.password, 10)

  // Insert as non-admin first, then atomically promote if truly first user
  await run(
    `INSERT INTO users (id, email, username, password_hash, name, is_admin) VALUES ($1, $2, $3, $4, $5, FALSE)`,
    [id, email, username, hash, opts.name || null]
  )
  await run(
    `UPDATE users SET is_admin = TRUE WHERE id = $1 AND (SELECT COUNT(*) FROM users) = 1`,
    [id]
  )

  const user = (await getUserById(id))!

  // Auto-provision mailbox
  if (domain) {
    await autoProvisionMailbox(user, opts.password)
  }

  return user
}

/** Register after email verification */
export async function registerWithHash(opts: {
  username: string; passwordHash: string; password?: string;
  name?: string; externalEmail?: string
}): Promise<User> {
  const username = opts.username.toLowerCase().replace(/[^a-z0-9._-]/g, '')

  const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username])
  if (existing) throw new Error('Username already taken')

  const domain = await getMailDomain()
  if (!domain) throw new Error('No mail domain configured')
  const email = `${username}@${domain}`

  const id = genId()
  const userCount = await queryOne('SELECT COUNT(*) as c FROM users')
  const isAdmin = parseInt(userCount?.c) === 0

  await run(
    `INSERT INTO users (id, email, username, external_email, password_hash, name, is_admin) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, email, username, opts.externalEmail || null, opts.passwordHash, opts.name || null, isAdmin]
  )

  const user = (await getUserById(id))!

  // Auto-provision mailbox with real password
  const mailPassword = opts.password || `Tmp_${Date.now()}_X1`
  await autoProvisionMailbox(user, mailPassword)

  return user
}

/** Create Stalwart mailbox for user */
async function autoProvisionMailbox(user: User, password: string) {
  try {
    const { createMailbox, mailEngineHealthy } = await import('./mailengine.js')
    if (!await mailEngineHealthy()) {
      console.warn(`[auto-provision] Stalwart not available, skipping`)
      return
    }

    await createMailbox({
      name: user.username,
      type: 'individual',
      secrets: [password],
      emails: [user.email],
      description: user.name || user.username,
    })

    // Auto-bind as email account
    const { addAccountInternal } = await import('./accounts.js')
    await addAccountInternal(user.id, {
      provider: 'stalwart',
      email: user.email,
      smtp_host: 'mail',
      smtp_port: 465,
      imap_host: 'mail',
      imap_port: 993,
      auth_user: user.email,
      auth_pass: password,
    })

    console.log(`[auto-provision] Created mailbox ${user.email}`)
  } catch (err) {
    console.error(`[auto-provision] Failed for ${user.email}:`, (err as Error).message)
  }
}

/** Login — accepts username or username@domain */
export async function login(email: string, password: string): Promise<User> {
  let row
  if (email.includes('@')) {
    row = await queryOne('SELECT * FROM users WHERE email = $1', [email])
  } else {
    row = await queryOne('SELECT * FROM users WHERE username = $1', [email])
  }
  if (!row) throw new Error('Invalid credentials')

  const user = rowToUser(row)
  if (user.is_banned) throw new Error('Account is banned')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('Invalid credentials')

  return user
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await queryOne('SELECT * FROM users WHERE id = $1', [id])
  return row ? rowToUser(row) : null
}

export async function listUsers(): Promise<User[]> {
  const rows = await queryAll('SELECT * FROM users ORDER BY created_at')
  return rows.map(rowToUser)
}

export async function updateProfile(userId: string, updates: { name?: string; password?: string }): Promise<User> {
  const user = await getUserById(userId)
  if (!user) throw new Error('User not found')

  if (updates.name !== undefined) {
    await run('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [updates.name, userId])
  }
  if (updates.password) {
    const hash = await bcrypt.hash(updates.password, 10)
    await run('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId])

    // Sync password to Stalwart mailbox and email_accounts
    try {
      const { listAccounts, encrypt } = await import('./accounts.js')
      const accounts = await listAccounts(userId)
      const stalwartAcc = accounts.find(a => a.provider === 'stalwart')
      if (stalwartAcc) {
        const { updateMailboxPassword } = await import('./mailengine.js')
        await updateMailboxPassword(user.username, updates.password)
        const encPass = encrypt(updates.password)
        await run('UPDATE email_accounts SET auth_pass_encrypted = $1 WHERE id = $2', [encPass, stalwartAcc.id])
      }
    } catch (err) {
      console.warn('[updateProfile] Failed to sync password to mail:', (err as Error).message)
    }
  }

  return (await getUserById(userId))!
}

export async function banUser(userId: string, banned: boolean): Promise<boolean> {
  const existing = await queryOne('SELECT id, is_admin FROM users WHERE id = $1', [userId])
  if (!existing) return false
  if (existing.is_admin) throw new Error('Cannot ban an admin')
  await run('UPDATE users SET is_banned = $1, updated_at = NOW() WHERE id = $2', [banned, userId])

  // Sync: disable/enable email accounts
  await run('UPDATE email_accounts SET is_active = $1 WHERE user_id = $2', [!banned, userId])

  return true
}
