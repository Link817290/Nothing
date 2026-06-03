import type { FastifyInstance } from 'fastify'
import { authenticate, requirePermission } from '../middleware/auth.js'
import {
  sendMessage, getInbox, getSent, getMessage, replyMessage,
  getReport, deleteMessage, setReadStatus,
  forwardMessage, searchMessages, getThread, listThreads, getThreadSummary,
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
      unread: q.unread === 'true' ? true : q.unread === 'false' ? false : undefined,
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
    const body = req.body as { text: string; attachments?: { filename: string; content: string; content_type?: string }[] }
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

  // ─── Threads ───────────────────────────────────────────────────
  app.get('/api/threads', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as { project?: string; limit?: string }
    return listThreads(user.id, { project: q.project, limit: q.limit ? parseInt(q.limit) : undefined })
  })

  app.get('/api/threads/:id', async (req) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    return getThread(user.id, id)
  })

  app.get('/api/threads/:id/summary', async (req) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    return getThreadSummary(user.id, id)
  })

  // AI summaries
  app.get('/api/threads/:id/summaries', async (req) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const { listSummaries } = await import('../services/thread-summary.js')
    return { summaries: await listSummaries(id, user.id) }
  })

  app.post('/api/threads/:id/summarize', { preHandler: requirePermission('write') }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = (req.body || {}) as { message_ids?: string[]; stream?: boolean }

    const { getMessagesForSummary, generateSummaryText, streamSummaryText, createSummary } = await import('../services/thread-summary.js')
    const messages = await getMessagesForSummary(id, user.id, body.message_ids)
    if (messages.length === 0) return reply.code(400).send({ error: 'No messages to summarize' })

    // Streaming mode
    if (body.stream) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })

      let fullText = ''
      for await (const chunk of streamSummaryText(messages)) {
        fullText += chunk
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      }

      // Save before ending stream
      try {
        await createSummary({
          threadId: id, userId: user.id, summary: fullText,
          periodStart: messages[0].created_at,
          periodEnd: messages[messages.length - 1].created_at,
          messageIds: messages.map((m: any) => m.id),
          generatedBy: 'manual',
        })
      } catch (e) {
        console.error('[summary] Save failed:', (e as Error).message)
      }

      reply.raw.write(`data: [DONE]\n\n`)
      reply.raw.end()
      return
    }

    // Non-streaming
    const summaryText = await generateSummaryText(messages)
    const result = await createSummary({
      threadId: id, userId: user.id, summary: summaryText,
      periodStart: messages[0].created_at,
      periodEnd: messages[messages.length - 1].created_at,
      messageIds: messages.map((m: any) => m.id),
      generatedBy: 'manual',
    })

    return { id: result.id, summary: summaryText }
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

  // ─── Reports ───────────────────────────────────────────────────
  app.get('/api/reports', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    return getReport(user.id, { period: q.period, project: q.project })
  })
}
