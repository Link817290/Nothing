import type { FastifyInstance } from 'fastify'
import { register, login, updateProfile } from '../services/auth.js'
import { createApiKey, listApiKeys, deleteApiKey } from '../services/apikeys.js'
import { authenticate } from '../middleware/auth.js'
import type { RegisterRequest, LoginRequest } from '../types/index.js'

export async function authRoutes(app: FastifyInstance) {
  // ─── Public: Register & Login ──────────────────────────────────

  app.post('/api/auth/register', async (req, reply) => {
    const body = req.body as RegisterRequest
    if (!body.email || !body.password) {
      return reply.code(400).send({ error: 'Email and password required' })
    }

    try {
      const user = await register(body)
      const perms = user.is_admin ? ['read', 'write', 'admin'] as const : ['read', 'write'] as const
      const { key } = await createApiKey(user.id, 'default', [...perms])

      // Check if user got an auto-provisioned mailbox
      const { listAccounts } = await import('../services/accounts.js')
      const accounts = await listAccounts(user.id)
      const hasMailbox = accounts.length > 0

      const { loadServerConfig } = await import('../config/index.js')
      const mailDomain = loadServerConfig().mailDomain

      return {
        api_key: key,
        user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
        mailbox: hasMailbox ? accounts[0].email : null,
        needs_email_setup: !hasMailbox,
        mail_domain: mailDomain || null,
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
        smtp_port: 587,
        imap_host: 'mail',
        imap_port: 993,
        auth_user: username,
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
