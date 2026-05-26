import type { FastifyInstance } from 'fastify'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import {
  listDomains, createDomain, deleteDomain, verifyDomainDns,
  listMailboxes, createMailbox, getMailbox, deleteMailbox,
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
      const dns = await verifyDomainDns(body.name)
      return { success: true, domain: body.name, dns }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.delete('/api/admin/domains/:name', async (req, reply) => {
    const { name } = req.params as { name: string }
    try {
      await deleteDomain(name)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

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
      return await getMailbox(name)
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

  // ─── Mail Engine Health ────────────────────────────────────────

  app.get('/api/admin/mail/status', async () => {
    const healthy = await mailEngineHealthy()
    return { status: healthy ? 'ok' : 'unreachable' }
  })
}
