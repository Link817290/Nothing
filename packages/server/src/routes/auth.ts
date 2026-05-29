import type { FastifyInstance } from 'fastify'
import { register, login, updateProfile } from '../services/auth.js'
import { createApiKey, listApiKeys, deleteApiKey } from '../services/apikeys.js'
import { authenticate } from '../middleware/auth.js'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  return null
}

function validateUsername(username: string): string | null {
  const clean = username.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  if (clean.length < 2) return 'Username must be at least 2 characters'
  if (clean.length > 30) return 'Username must be at most 30 characters'
  if (!/^[a-z]/.test(clean)) return 'Username must start with a letter'
  return null
}

export async function authRoutes(app: FastifyInstance) {
  // ─── Public: Register & Login ──────────────────────────────────

  app.post('/api/auth/register', async (req, reply) => {
    const body = req.body as { username?: string; password?: string; name?: string; external_email?: string }
    if (!body.username || !body.password) {
      return reply.code(400).send({ error: 'Username and password required' })
    }

    const unErr = validateUsername(body.username)
    if (unErr) return reply.code(400).send({ error: unErr })
    const pwErr = validatePassword(body.password)
    if (pwErr) return reply.code(400).send({ error: pwErr })

    const username = body.username.toLowerCase().replace(/[^a-z0-9._-]/g, '')

    // Check if username taken
    const { queryOne } = await import('../repositories/db.js')
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username])
    if (existing) return reply.code(409).send({ error: 'Username already taken' })

    const { isVerificationRequired, createVerification, sendVerificationEmail } = await import('../services/verification.js')

    if (!await isVerificationRequired()) {
      // First user = admin, no verification
      try {
        const user = await register({ username, password: body.password, name: body.name })
        const perms = user.is_admin ? ['read', 'write', 'admin'] as const : ['read', 'write'] as const
        const { key } = await createApiKey(user.id, 'default', [...perms])

        const { listAccounts } = await import('../services/accounts.js')
        const accounts = await listAccounts(user.id)

        return {
          api_key: key,
          user: { id: user.id, email: user.email, username: user.username, name: user.name, is_admin: user.is_admin },
          mailbox: accounts.length > 0 ? accounts[0].email : null,
          needs_verification: false,
        }
      } catch (err) {
        return reply.code(409).send({ error: (err as Error).message })
      }
    }

    // Non-first user: need external email for verification
    if (!body.external_email) {
      return reply.code(400).send({ error: 'External email required for verification' })
    }

    try {
      const { code } = await createVerification(username, body.external_email, body.password, body.name)
      await sendVerificationEmail(body.external_email, code)
      return { needs_verification: true, external_email: body.external_email }
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message })
    }
  })

  // Step 2: Verify code and complete registration
  app.post('/api/auth/verify', async (req, reply) => {
    const body = req.body as { external_email?: string; email?: string; code: string }
    const externalEmail = body.external_email || body.email // backward compat
    if (!externalEmail || !body.code) {
      return reply.code(400).send({ error: 'External email and code required' })
    }

    const { verifyCode } = await import('../services/verification.js')
    const data = await verifyCode(externalEmail, body.code)
    if (!data) {
      return reply.code(400).send({ error: 'Invalid or expired verification code' })
    }

    try {
      const { registerWithHash } = await import('../services/auth.js')
      const user = await registerWithHash({
        username: data.username,
        passwordHash: data.passwordHash,
        password: data.password,
        name: data.name,
        externalEmail,
      })
      const perms = user.is_admin ? ['read', 'write', 'admin'] as const : ['read', 'write'] as const
      const { key } = await createApiKey(user.id, 'default', [...perms])

      const { listAccounts } = await import('../services/accounts.js')
      const accounts = await listAccounts(user.id)

      return {
        api_key: key,
        user: { id: user.id, email: user.email, username: user.username, name: user.name, is_admin: user.is_admin },
        mailbox: accounts.length > 0 ? accounts[0].email : null,
      }
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message })
    }
  })

  app.post('/api/auth/login', async (req, reply) => {
    const body = req.body as { email?: string; password?: string }
    if (!body.email || !body.password) {
      return reply.code(400).send({ error: 'Username/email and password required' })
    }

    try {
      const user = await login(body.email, body.password)
      const token = app.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '7d' })
      return { token, user: { id: user.id, email: user.email, username: user.username, name: user.name, is_admin: user.is_admin } }
    } catch (err) {
      return reply.code(401).send({ error: (err as Error).message })
    }
  })

  // ─── Authenticated: Me & API Keys ─────────────────────────────

  app.get('/api/me', { preHandler: authenticate }, async (req) => {
    const user = (req as any).user as { id: string; email: string; name?: string; is_admin: boolean }
    return { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }
  })

  // Claim mailbox (for admin who registered before domain was configured)
  app.post('/api/me/mailbox', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string; email: string; name?: string }
    const body = req.body as { password: string }
    if (!body.password) return reply.code(400).send({ error: 'Password required' })
    const pwErr = validatePassword(body.password)
    if (pwErr) return reply.code(400).send({ error: pwErr })

    try {
      const { listAccounts } = await import('../services/accounts.js')
      const accounts = await listAccounts(user.id)
      if (accounts.some(a => a.provider === 'stalwart')) {
        return reply.code(409).send({ error: 'You already have a mailbox' })
      }

      const { getUserById } = await import('../services/auth.js')
      const fullUser = await getUserById(user.id)
      if (!fullUser) return reply.code(404).send({ error: 'User not found' })

      const { listDomains, createMailbox, mailEngineHealthy } = await import('../services/mailengine.js')
      if (!await mailEngineHealthy()) return reply.code(502).send({ error: 'Mail engine not available' })
      const domains = await listDomains()
      if (!domains?.length) return reply.code(400).send({ error: 'No mail domain configured' })

      const mailDomain = domains[0].name
      const username = (fullUser as any).username || user.email.split('@')[0]
      const mailEmail = `${username}@${mailDomain}`

      await createMailbox({
        name: username,
        type: 'individual',
        secrets: [body.password],
        emails: [mailEmail],
        description: fullUser.name || username,
      })

      const { addAccountInternal } = await import('../services/accounts.js')
      await addAccountInternal(user.id, {
        provider: 'stalwart',
        email: mailEmail,
        smtp_host: 'mail',
        smtp_port: 465,
        imap_host: 'mail',
        imap_port: 993,
        auth_user: mailEmail,
        auth_pass: body.password,
      })

      // Update user email to platform email if it was bare username
      if (!user.email.includes('@')) {
        const { run } = await import('../repositories/db.js')
        await run('UPDATE users SET email = $1 WHERE id = $2', [mailEmail, user.id])
      }

      return { success: true, email: mailEmail }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.put('/api/me', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as { name?: string; password?: string }
    try {
      const updated = await updateProfile(user.id, body)
      return { id: updated.id, email: updated.email, name: updated.name }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.get('/api/keys', { preHandler: authenticate }, async (req) => {
    const user = (req as any).user as { id: string }
    return { keys: await listApiKeys(user.id) }
  })

  app.post('/api/keys', { preHandler: authenticate }, async (req) => {
    const user = (req as any).user as { id: string }
    const body = req.body as { name?: string }
    const result = await createApiKey(user.id, body?.name)
    return { id: result.id, key: result.key }
  })

  app.delete('/api/keys/:id', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const deleted = await deleteApiKey(user.id, id)
    if (!deleted) return reply.code(404).send({ error: 'Key not found' })
    return { success: true }
  })
}
