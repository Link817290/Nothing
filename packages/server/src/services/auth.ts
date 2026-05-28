import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { queryOne, queryAll, run } from '../repositories/db.js'
import type { RegisterRequest, LoginRequest, User } from '../types/index.js'

function genId() {
  return `usr_${randomBytes(8).toString('base64url')}`
}

function rowToUser(row: Record<string, any>): User {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    name: row.name || undefined,
    is_admin: row.is_admin,
    is_banned: row.is_banned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function register(req: RegisterRequest): Promise<User> {
  const setting = await queryOne("SELECT value FROM server_settings WHERE key = 'open_registration'")
  if (setting && setting.value === 'false') {
    throw new Error('Registration is closed')
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [req.email])
  if (existing) throw new Error('Email already registered')

  const id = genId()
  const hash = await bcrypt.hash(req.password, 10)

  const userCount = await queryOne('SELECT COUNT(*) as c FROM users')
  const isAdmin = parseInt(userCount?.c) === 0

  await run(
    `INSERT INTO users (id, email, password_hash, name, is_admin) VALUES ($1, $2, $3, $4, $5)`,
    [id, req.email, hash, req.name || null, isAdmin]
  )

  const user = (await getUserById(id))!

  // Auto-provision mailbox on self-hosted domain
  await autoProvisionMailbox(user, req.password, req.mail_username)

  return user
}

/** Register with pre-hashed password (used after email verification) */
export async function registerWithHash(email: string, passwordHash: string, name?: string, mailUsername?: string): Promise<User> {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) throw new Error('Email already registered')

  const id = genId()
  const userCount = await queryOne('SELECT COUNT(*) as c FROM users')
  const isAdmin = parseInt(userCount?.c) === 0

  await run(
    `INSERT INTO users (id, email, password_hash, name, is_admin) VALUES ($1, $2, $3, $4, $5)`,
    [id, email, passwordHash, name || null, isAdmin]
  )

  const user = (await getUserById(id))!

  // Auto-provision mailbox — use a temp password for Stalwart
  // (user already has hashed password in our DB, Stalwart needs plaintext for its own hash)
  const tempPassword = `tmp_${Date.now()}`
  await autoProvisionMailbox(user, tempPassword, mailUsername)

  return user
}

/** Create a mailbox on the platform's mail domain for the new user */
async function autoProvisionMailbox(user: User, password: string, customUsername?: string) {
  try {
    // Get mail domain from Stalwart's configured domains (not env var)
    const { listDomains, createMailbox, mailEngineHealthy } = await import('./mailengine.js')
    const healthy = await mailEngineHealthy()
    if (!healthy) {
      console.warn(`[auto-provision] Stalwart not available, skipping`)
      return
    }

    const domains = await listDomains()
    if (!domains || domains.length === 0) {
      console.warn(`[auto-provision] No domains configured in Stalwart, skipping`)
      return
    }

    // Use first domain
    const mailDomain = domains[0].name
    const username = customUsername?.toLowerCase().replace(/[^a-z0-9._-]/g, '')
      || user.name?.toLowerCase().replace(/[^a-z0-9]/g, '')
      || user.email.split('@')[0].replace(/[^a-z0-9]/g, '')
    const mailEmail = `${username}@${mailDomain}`

    await createMailbox({
      name: username,
      type: 'individual',
      secrets: [password],
      emails: [mailEmail],
      description: user.name || username,
    })

    // Auto-bind as email account
    const { addAccountInternal } = await import('./accounts.js')
    await addAccountInternal(user.id, {
      provider: 'stalwart',
      email: mailEmail,
      smtp_host: 'mail',
      smtp_port: 465,
      imap_host: 'mail',
      imap_port: 993,
      auth_user: username,
      auth_pass: password,
    })

    console.log(`[auto-provision] Created mailbox ${mailEmail} for user ${user.id}`)
  } catch (err) {
    // Don't fail registration if mailbox creation fails
    console.error(`[auto-provision] Failed for ${mailEmail}:`, (err as Error).message)
  }
}

export async function login(req: LoginRequest): Promise<User> {
  const row = await queryOne('SELECT * FROM users WHERE email = $1', [req.email])
  if (!row) throw new Error('Invalid credentials')

  const user = rowToUser(row)
  if (user.is_banned) throw new Error('Account is banned')

  const valid = await bcrypt.compare(req.password, user.password_hash)
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
  }

  return (await getUserById(userId))!
}

export async function banUser(userId: string, banned: boolean): Promise<boolean> {
  const existing = await queryOne('SELECT id, is_admin FROM users WHERE id = $1', [userId])
  if (!existing) return false
  if (existing.is_admin) throw new Error('Cannot ban an admin')
  await run('UPDATE users SET is_banned = $1, updated_at = NOW() WHERE id = $2', [banned, userId])
  return true
}
