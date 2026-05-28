import type { FastifyInstance } from 'fastify'
import { register, login, updateProfile } from '../services/auth.js'
import { createApiKey, listApiKeys, deleteApiKey } from '../services/apikeys.js'
import { authenticate } from '../middleware/auth.js'
import type { RegisterRequest, LoginRequest } from '../types/index.js'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  return null
}

export async function authRoutes(app: FastifyInstance) {
  // ─── Public: Register & Login ──────────────────────────────────

  // Step 1: Start registration (sends verification code if not first user)
  app.post('/api/auth/register', async (req, reply) => {
    const body = req.body as RegisterRequest
    if (!body.email || !body.password) {
      return reply.code(400).send({ error: 'Email and password required' })
    }
    const pwErr = validatePassword(body.password)
    if (pwErr) return reply.code(400).send({ error: pwErr })

    // Check if email already registered
    const { queryOne } = await import('../repositories/db.js')
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [body.email])
    if (existing) return reply.code(409).send({ error: 'Email already registered' })

    const { isVerificationRequired, createVerification, sendVerificationEmail } = await import('../services/verification.js')

    if (!await isVerificationRequired()) {
      // First user = admin, skip verification
      try {
        const user = await register(body)
        const perms = user.is_admin ? ['read', 'write', 'admin'] as const : ['read', 'write'] as const
        const { key } = await createApiKey(user.id, 'default', [...perms])

        const { listAccounts } = await import('../services/accounts.js')
        const accounts = await listAccounts(user.id)

        return {
          api_key: key,
          user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
          mailbox: accounts.length > 0 ? accounts[0].email : null,
          needs_verification: false,
        }
      } catch (err) {
        return reply.code(409).send({ error: (err as Error).message })
      }
    }

    // Non-first user: send verification code
    try {
      const { code } = await createVerification(body.email, body.password, body.name, body.mail_username)
      await sendVerificationEmail(body.email, code)
      return { needs_verification: true, email: body.email }
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message })
    }
  })

  // Step 2: Verify code and complete registration
  app.post('/api/auth/verify', async (req, reply) => {
    const body = req.body as { email: string; code: string }
    if (!body.email || !body.code) {
      return reply.code(400).send({ error: 'Email and code required' })
    }

    const { verifyCode } = await import('../services/verification.js')
    const data = await verifyCode(body.email, body.code)
    if (!data) {
      return reply.code(400).send({ error: 'Invalid or expired verification code' })
    }

    try {
      // Create user with pre-hashed password
      const { registerWithHash } = await import('../services/auth.js')
      const user = await registerWithHash(body.email, data.passwordHash, data.name, data.mailUsername, data.password)
      const perms = user.is_admin ? ['read', 'write', 'admin'] as const : ['read', 'write'] as const
      const { key } = await createApiKey(user.id, 'default', [...perms])

      const { listAccounts } = await import('../services/accounts.js')
      const accounts = await listAccounts(user.id)

      return {
        api_key: key,
        user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
        mailbox: accounts.length > 0 ? accounts[0].email : null,
      }
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message })
    }
  })

  app.post('/api/auth/login', async (req, reply) => {
    const body = req.body as LoginRequest
    if (!body.email || !body.password) {
      return reply.code(400).send({ error: 'Email and password required' })
    }

    try {
      const user = await login(body)
      const token = app.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '7d' })
      return { token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } }
    } catch (err) {
      return reply.code(401).send({ error: (err as Error).message })
    }
  })

  // ─── Authenticated: Me & API Keys ─────────────────────────────

  app.get('/api/me', { preHandler: authenticate }, async (req) => {
    const user = (req as any).user as { id: string; email: string; name?: string; is_admin: boolean }
    return { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }
  })

  // Claim a mailbox on the platform domain
  app.post('/api/me/mailbox', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string; email: string; name?: string }
    const body = req.body as { username?: string; password: string }
    if (!body.password) return reply.code(400).send({ error: 'Password required' })
    const pwErr = validatePassword(body.password)
    if (pwErr) return reply.code(400).send({ error: pwErr })

    try {
      // Check if user already has a stalwart account
      const { listAccounts } = await import('../services/accounts.js')
      const accounts = await listAccounts(user.id)
      if (accounts.some(a => a.provider === 'stalwart')) {
        return reply.code(409).send({ error: 'You already have a mailbox' })
      }

      // Get domain from Stalwart
      const { listDomains, createMailbox, mailEngineHealthy } = await import('../services/mailengine.js')
      if (!await mailEngineHealthy()) {
        return reply.code(502).send({ error: 'Mail engine not available' })
      }
      const domains = await listDomains()
      if (!domains?.length) {
        return reply.code(400).send({ error: 'No mail domain configured' })
      }

      const mailDomain = domains[0].name
      const username = body.username?.toLowerCase().replace(/[^a-z0-9._-]/g, '')
        || user.name?.toLowerCase().replace(/[^a-z0-9]/g, '')
        || user.email.split('@')[0].replace(/[^a-z0-9]/g, '')
      const mailEmail = `${username}@${mailDomain}`

      await createMailbox({
        name: username,
        type: 'individual',
        secrets: [body.password],
        emails: [mailEmail],
        description: user.name || username,
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
