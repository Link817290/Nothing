import Fastify from 'fastify'
import { loadConfig, saveConfig, paths } from './config.js'
import { getDb, closeDb } from './db.js'
import { sendMessage, getInbox, getSent, getMessage, replyMessage, getProjects } from './services/messages.js'
import { randomBytes } from 'crypto'

/** Embedded local server — runs inside nothing-cli process */
export async function startEmbeddedServer() {
  let config = loadConfig()
  const app = Fastify({ logger: false })

  // Initialize DB
  await getDb()

  // ─── Auth middleware ──────────────────────────────────────────

  app.decorateRequest('authenticated', false)

  app.addHook('onRequest', async (req, reply) => {
    const path = req.url.split('?')[0]
    // Public routes (no auth needed): health, setup, static files
    if (path === '/health' || path.startsWith('/api/setup') || !path.startsWith('/api/')) return

    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'auth_failed', message: 'Missing or invalid Authorization header' })
      return
    }

    const token = auth.slice(7)
    // Check master key from config
    if (token === config.token) { (req as any).authenticated = true; return }
    // Check keys in DB
    const { createHash } = await import('crypto')
    const hash = createHash('sha256').update(token).digest('hex')
    const database = await getDb()
    const stmt = database.prepare(`SELECT id FROM tokens WHERE token_hash = ? AND revoked = 0`)
    stmt.bind([hash])
    const found = stmt.step()
    stmt.free()
    if (!found) {
      reply.code(401).send({ error: 'auth_failed', message: 'Invalid API key' })
      return
    }

    (req as any).authenticated = true
  })

  // ─── Setup API ────────────────────────────────────────────────

  app.get('/api/setup/status', async () => ({
    initialized: config.initialized ?? false,
    token: config.token,
    email: config.email,
    provider: config.provider,
  }))

  // Auto-generate an API key for a new browser/device
  app.post('/api/setup/auto-key', async (req) => {
    if (!config.initialized) return { error: 'Not initialized' }
    const body = req.body as { name?: string }
    const { createToken } = await import('./services/tokens.js')
    const result = await createToken({
      name: body.name || `Browser · ${new Date().toISOString().slice(0, 10)}`,
      permissions: ['send', 'inbox', 'read', 'reply'],
    })
    return { token: result.token }
  })

  app.post('/api/setup/init', async (req) => {
    const body = req.body as {
      provider: string
      email: string
      password: string
      smtp_host: string
      smtp_port: number
      imap_host: string
      imap_port: number
    }

    const token = `ntk_live_${randomBytes(24).toString('base64url')}`

    config = {
      ...config,
      token,
      email: body.email,
      provider: body.provider,
      smtp_host: body.smtp_host,
      smtp_port: body.smtp_port,
      imap_host: body.imap_host,
      imap_port: body.imap_port,
      smtp_user: body.email,
      smtp_pass: body.password,
      initialized: true,
    }

    saveConfig(config)
    return { success: true, email: config.email, token }
  })

  app.post('/api/setup/test-connection', async (req) => {
    const body = req.body as {
      smtp_host: string; smtp_port: number
      imap_host: string; imap_port: number
      email: string; password: string
    }

    let smtp = false
    try {
      const { createTransport } = await import('nodemailer')
      const t = createTransport({
        host: body.smtp_host,
        port: body.smtp_port,
        secure: body.smtp_port === 465,
        auth: { user: body.email, pass: body.password },
        connectionTimeout: 10000,
      })
      await t.verify()
      t.close()
      smtp = true
    } catch {}

    let imap = false
    try {
      const { ImapFlow } = await import('imapflow')
      const client = new ImapFlow({
        host: body.imap_host,
        port: body.imap_port,
        secure: true,
        auth: { user: body.email, pass: body.password },
        logger: false,
      })
      await client.connect()
      await client.logout()
      imap = true
    } catch {}

    return { smtp, imap }
  })

  // ─── Messages API ─────────────────────────────────────────────

  app.post('/api/messages/send', async (req) => {
    return sendMessage(req.body as Parameters<typeof sendMessage>[0])
  })

  app.get('/api/messages/inbox', async (req) => {
    const q = req.query as Record<string, string>
    return getInbox({
      unread: q.unread !== 'false',
      project: q.project,
      label: q.label,
      channel: q.channel,
      source: q.source,
      agent: q.agent,
      limit: q.limit ? parseInt(q.limit) : undefined,
    })
  })

  app.get('/api/messages/sent', async (req) => {
    const q = req.query as Record<string, string>
    return getSent({
      project: q.project,
      limit: q.limit ? parseInt(q.limit) : undefined,
    })
  })

  app.get('/api/messages/:id', async (req) => {
    const { id } = req.params as { id: string }
    const msg = getMessage(id)
    if (!msg) throw { statusCode: 404, message: 'Message not found' }
    return msg
  })

  app.post('/api/messages/:id/reply', async (req) => {
    const { id } = req.params as { id: string }
    return replyMessage(id, req.body as Parameters<typeof replyMessage>[1])
  })

  // ─── Projects API ─────────────────────────────────────────────

  app.get('/api/projects', async () => {
    return getProjects()
  })

  // ─── Reports API ──────────────────────────────────────────────

  app.get('/api/reports', async (req) => {
    const { getReport } = await import('./services/reports.js')
    const q = req.query as Record<string, string>
    return getReport({ period: q.period as any, project: q.project })
  })

  // ─── Tokens API ────────────────────────────────────────────────

  app.get('/api/account/tokens', async () => {
    const { listTokens } = await import('./services/tokens.js')
    return { tokens: await listTokens() }
  })

  app.post('/api/account/tokens', async (req) => {
    const { createToken } = await import('./services/tokens.js')
    return createToken(req.body as any)
  })

  app.delete('/api/account/tokens/:id', async (req) => {
    const { revokeToken } = await import('./services/tokens.js')
    const { id } = req.params as { id: string }
    await revokeToken(id)
    return { success: true }
  })

  // ─── Account API ──────────────────────────────────────────────

  app.get('/api/account', async () => ({
    email: config.email,
    provider: config.provider,
    initialized: config.initialized,
  }))

  // ─── Health ───────────────────────────────────────────────────

  app.get('/health', async () => ({
    status: 'ok',
    initialized: config.initialized ?? false,
    email: config.email,
  }))

  // ─── Static files (web dashboard) ──────────────────────────────

  const { existsSync } = await import('fs')
  const { join } = await import('path')
  const webDistPath = join(paths.dir, 'web')
  if (existsSync(webDistPath)) {
    const fastifyStatic = await import('@fastify/static')
    await app.register(fastifyStatic.default, {
      root: webDistPath,
      prefix: '/',
    })
    // SPA fallback: any non-API route serves index.html
    app.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'not_found', message: `Route ${req.url} not found` })
      } else {
        return reply.sendFile('index.html')
      }
    })
  }

  // ─── IMAP polling (start after server is ready) ────────────────

  if (config.initialized && config.imap_host) {
    import('./services/imap.js').then(({ startImapPolling }) => {
      startImapPolling(30000).catch(err => console.error('[imap] Start error:', err.message))
    })
  }

  // ─── Shutdown ─────────────────────────────────────────────────

  app.addHook('onClose', async () => {
    const { stopImapPolling } = await import('./services/imap.js')
    stopImapPolling()
    closeDb()
  })

  // ─── Start ────────────────────────────────────────────────────

  const port = parseInt(new URL(config.api_host).port || '3000')
  await app.listen({ port, host: '127.0.0.1' })
  return app
}
