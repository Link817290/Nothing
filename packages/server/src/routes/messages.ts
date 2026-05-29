import type { FastifyInstance } from 'fastify'
import { authenticate, requirePermission } from '../middleware/auth.js'
import {
  sendMessage, getInbox, getSent, getMessage, replyMessage,
  getProjects, getReport, deleteMessage, setReadStatus,
  forwardMessage, searchMessages, getThread,
} from '../services/messages.js'
import type { SendRequest, InboxQuery } from '../types/index.js'

export async function messageRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // ─── Send ──────────────────────────────────────────────────────
  app.post('/api/messages/send', { preHandler: requirePermission('write') }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as SendRequest
    if (!body.to || !body.text) {
      return reply.code(400).send({ error: 'to and text required' })
    }
    try {
      return await sendMessage(user.id, body)
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // ─── Inbox ─────────────────────────────────────────────────────
  app.get('/api/messages/inbox', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    return getInbox(user.id, {
      unread: q.unread !== 'false',
      project: q.project,
      label: q.label,
      channel: q.channel,
      source: q.source,
      agent: q.agent,
      account_id: q.account_id,
      limit: q.limit ? parseInt(q.limit) : undefined,
    })
  })

  // ─── Sent ──────────────────────────────────────────────────────
  app.get('/api/messages/sent', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    return getSent(user.id, {
      project: q.project,
      channel: q.channel,
      limit: q.limit ? parseInt(q.limit) : undefined,
    })
  })

  // ─── Search ────────────────────────────────────────────────────
  app.get('/api/messages/search', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    if (!q.q) return { messages: [] }
    return searchMessages(user.id, {
      q: q.q,
      project: q.project,
      limit: q.limit ? parseInt(q.limit) : undefined,
    })
  })

  // ─── Read ──────────────────────────────────────────────────────
  app.get('/api/messages/:id', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const msg = await getMessage(user.id, id)
    if (!msg) return reply.code(404).send({ error: 'Message not found' })
    return msg
  })

  // ─── Delete ────────────────────────────────────────────────────
  app.delete('/api/messages/:id', { preHandler: requirePermission('write') }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const deleted = await deleteMessage(user.id, id)
    if (!deleted) return reply.code(404).send({ error: 'Message not found' })
    return { success: true }
  })

  // ─── Mark read/unread ──────────────────────────────────────────
  app.put('/api/messages/:id/read', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { is_read: boolean }
    const updated = await setReadStatus(user.id, id, body.is_read ?? true)
    if (!updated) return reply.code(404).send({ error: 'Message not found' })
    return { success: true }
  })

  // ─── Reply ─────────────────────────────────────────────────────
  app.post('/api/messages/:id/reply', { preHandler: requirePermission('write') }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { text: string; files?: string[] }
    if (!body.text) return reply.code(400).send({ error: 'text required' })
    try {
      return await replyMessage(user.id, id, body)
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // ─── Forward ───────────────────────────────────────────────────
  app.post('/api/messages/:id/forward', { preHandler: requirePermission('write') }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { to: string; text?: string }
    if (!body.to) return reply.code(400).send({ error: 'to required' })
    try {
      return await forwardMessage(user.id, id, body)
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  // ─── Thread ────────────────────────────────────────────────────
  app.get('/api/threads/:id', async (req) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    return getThread(user.id, id)
  })

  // ─── Attachments ────────────────────────────────────────────────
  app.get('/api/messages/:id/attachments', async (req) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const msg = await getMessage(user.id, id)
    if (!msg) return { attachments: [] }
    const { listAttachments } = await import('../services/attachments.js')
    return { attachments: await listAttachments(id) }
  })

  app.get('/api/attachments/:id/download', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const { getAttachment } = await import('../services/attachments.js')
    const att = await getAttachment(id, user.id)
    if (!att) return reply.code(404).send({ error: 'Attachment not found' })
    reply.header('Content-Type', att.contentType)
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(att.filename)}"`)
    reply.header('Content-Length', att.content.length)
    return reply.send(att.content)
  })

  // ─── Projects ──────────────────────────────────────────────────
  app.get('/api/projects', async (req) => {
    const user = (req as any).user as { id: string }
    return getProjects(user.id)
  })

  // ─── Reports ───────────────────────────────────────────────────
  app.get('/api/reports', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    return getReport(user.id, { period: q.period, project: q.project })
  })
}
