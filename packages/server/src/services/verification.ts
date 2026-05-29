import { randomBytes, randomInt } from 'crypto'
import { queryOne, run } from '../repositories/db.js'
import bcrypt from 'bcryptjs'
import { encrypt, decrypt } from './accounts.js'

function genId() {
  return `vrf_${randomBytes(8).toString('base64url')}`
}

function genCode(): string {
  return String(randomInt(100000, 999999))
}

/** Check if verification is required (skip if no users exist = first admin) */
export async function isVerificationRequired(): Promise<boolean> {
  const count = await queryOne('SELECT COUNT(*) as c FROM users')
  return parseInt(count?.c) > 0
}

/** Create a pending registration with verification code */
export async function createVerification(
  username: string, externalEmail: string, password: string, name?: string
): Promise<{ id: string; code: string }> {
  // Delete any existing codes for this external email
  await run('DELETE FROM verification_codes WHERE external_email = $1', [externalEmail])

  const id = genId()
  const code = genCode()
  const passwordHash = await bcrypt.hash(password, 10)
  const passwordEncrypted = encrypt(password)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await run(
    `INSERT INTO verification_codes (id, username, external_email, code, name, password_hash, password_encrypted, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, username, externalEmail, code, name || null, passwordHash, passwordEncrypted, expiresAt.toISOString()]
  )

  return { id, code }
}

/** Verify a code and return the pending registration data */
export async function verifyCode(externalEmail: string, code: string): Promise<{
  username: string; name?: string; passwordHash: string; password?: string
} | null> {
  const row = await queryOne(
    'SELECT * FROM verification_codes WHERE external_email = $1 AND code = $2 AND expires_at > NOW()',
    [externalEmail, code]
  )
  if (!row) return null

  // Delete used code
  await run('DELETE FROM verification_codes WHERE external_email = $1', [externalEmail])

  return {
    username: row.username,
    name: row.name || undefined,
    passwordHash: row.password_hash,
    password: row.password_encrypted ? decrypt(row.password_encrypted) : undefined,
  }
}

/** Send verification code via Stalwart SMTP */
export async function sendVerificationEmail(toEmail: string, code: string): Promise<void> {
  const { listDomains, mailEngineHealthy } = await import('./mailengine.js')
  if (!await mailEngineHealthy()) throw new Error('Mail engine not available')

  const domains = await listDomains()
  if (!domains?.length) throw new Error('No mail domain configured')

  const domainName = domains[0].name
  const fromEmail = `noreply@${domainName}`
  const authUser = `noreply@${domainName}`
  const authPass = process.env.MAIL_ADMIN_PASS || ''

  const { createTransport } = await import('nodemailer')
  const transporter = createTransport({
    host: process.env.MAIL_SMTP_HOST || 'mail',
    port: parseInt(process.env.MAIL_SMTP_PORT || '465'),
    secure: true,
    auth: { user: authUser, pass: authPass },
    tls: { rejectUnauthorized: false },
  })

  await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: `Your verification code: ${code}`,
    text: `Your Nothing verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-size: 20px; margin-bottom: 8px;">Nothing</h2>
        <p style="color: #666; margin-bottom: 24px;">Enter this code to complete your registration:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #999; font-size: 13px;">This code expires in 10 minutes.</p>
      </div>
    `,
  })

  transporter.close()
}
