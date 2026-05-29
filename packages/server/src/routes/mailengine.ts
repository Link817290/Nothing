import type { FastifyInstance } from 'fastify'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import {
  listDomains, createDomain, deleteDomain, verifyDomainDns, getDomainDnsRecords,
  listMailboxes, createMailbox, getMailbox, deleteMailbox,
  addAlias, removeAlias, setMailboxQuota,
  mailEngineHealthy,
} from '../services/mailengine.js'

export async function mailEngineRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireAdmin)

  // ─── Domains ───────────────────────────────────────────────────

  app.get('/api/admin/domains', async (_req, reply) => {
    try {
      return { domains: await listDomains() }
    } catch (err) {
      return reply.code(502).send({ error: (err as Error).message })
    }
  })

  app.post('/api/admin/domains', async (req, reply) => {
    const body = req.body as { name: string }
    if (!body.name) return reply.code(400).send({ error: 'Domain name required' })
    try {
      await createDomain(body.name)

      // Auto-create system noreply mailbox for sending verification emails
      try {
        await createMailbox({
          name: 'noreply',
          type: 'individual',
          secrets: [process.env.MAIL_ADMIN_PASS || 'noreply'],
          emails: [`noreply@${body.name}`],
          description: 'System (do not reply)',
        })
        console.log(`[mail] Created noreply@${body.name}`)
      } catch (e) {
        console.warn(`[mail] Failed to create noreply mailbox: ${(e as Error).message}`)
      }

      const dns = await getDomainDnsRecords(body.name)
      return { success: true, domain: body.name, dns }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.delete('/api/admin/domains/:name', async (req, reply) => {
    const { name } = req.params as { name: string }
    try {
      // Disable email_accounts on this domain
      const { run } = await import('../repositories/db.js')
      await run(
        `UPDATE email_accounts SET is_active = FALSE WHERE email LIKE $1`,
        [`%@${name}`]
      )

      await deleteDomain(name)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // Get required DNS records for a domain
  app.get('/api/admin/domains/:name/dns', async (req, reply) => {
    const { name } = req.params as { name: string }
    try {
      return await getDomainDnsRecords(name)
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // Verify DNS records
  app.post('/api/admin/domains/:name/verify', async (req, reply) => {
    const { name } = req.params as { name: string }
    try {
      return await verifyDomainDns(name)
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // ─── Mailboxes ─────────────────────────────────────────────────

  app.get('/api/admin/mailboxes', async (_req, reply) => {
    try {
      return { mailboxes: await listMailboxes() }
    } catch (err) {
      return reply.code(502).send({ error: (err as Error).message })
    }
  })

  app.post('/api/admin/mailboxes', async (req, reply) => {
    const body = req.body as { username: string; password: string; email: string; description?: string }
    if (!body.username || !body.password || !body.email) {
      return reply.code(400).send({ error: 'username, password, and email required' })
    }
    try {
      await createMailbox({
        name: body.username, type: 'individual',
        secrets: [body.password], emails: [body.email], description: body.description,
      })
      return { success: true, email: body.email }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.get('/api/admin/mailboxes/:name', async (req, reply) => {
    const { name } = req.params as { name: string }
    try {
      const mailbox = await getMailbox(name)
      if (!mailbox) return reply.code(404).send({ error: 'Mailbox not found' })
      return mailbox
    } catch (err) {
      return reply.code(404).send({ error: (err as Error).message })
    }
  })

  app.delete('/api/admin/mailboxes/:name', async (req, reply) => {
    const { name } = req.params as { name: string }
    try {
      await deleteMailbox(name)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // ─── Aliases ───────────────────────────────────────────────────

  app.post('/api/admin/mailboxes/:name/aliases', async (req, reply) => {
    const { name } = req.params as { name: string }
    const body = req.body as { alias: string }
    if (!body.alias) return reply.code(400).send({ error: 'alias required' })
    try {
      await addAlias(name, body.alias)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.delete('/api/admin/mailboxes/:name/aliases/:alias', async (req, reply) => {
    const { name, alias } = req.params as { name: string; alias: string }
    try {
      await removeAlias(name, alias)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // ─── Quota ─────────────────────────────────────────────────────

  app.put('/api/admin/mailboxes/:name/quota', async (req, reply) => {
    const { name } = req.params as { name: string }
    const body = req.body as { quota_mb: number }
    if (!body.quota_mb) return reply.code(400).send({ error: 'quota_mb required' })
    try {
      await setMailboxQuota(name, body.quota_mb * 1024 * 1024)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // ─── Mail Engine Health ────────────────────────────────────────

  app.get('/api/admin/mail/status', async () => {
    const healthy = await mailEngineHealthy()
    return { status: healthy ? 'ok' : 'unreachable' }
  })
}
