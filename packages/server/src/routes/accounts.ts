import type { FastifyInstance } from 'fastify'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { addAccount, listAccounts, removeAccount, getUserAccount } from '../services/accounts.js'
import { syncAccountById } from '../mail/imap.js'
import { createTask, updateTaskProgress, completeTask, failTask, getTask } from '../services/tasks.js'
import type { AddAccountRequest } from '../types/index.js'

export async function accountRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/api/accounts', async (req) => {
    const user = (req as any).user as { id: string }
    const accounts = await listAccounts(user.id)
    return {
      accounts: accounts.map(a => ({
        id: a.id, provider: a.provider, email: a.email, is_active: a.is_active,
        last_sync_at: a.last_sync_at, created_at: a.created_at,
      })),
    }
  })

  app.post('/api/accounts', { preHandler: requirePermission('write') }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as AddAccountRequest
    if (!body.provider || !body.email || !body.password) {
      return reply.code(400).send({ error: 'Provider, email, and password required' })
    }
    try {
      const account = await addAccount(user.id, body)
      return {
        id: account.id, provider: account.provider, email: account.email,
        is_active: account.is_active, created_at: account.created_at,
      }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.delete('/api/accounts/:id', { preHandler: requirePermission('write') }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const removed = await removeAccount(user.id, id)
    if (!removed) return reply.code(404).send({ error: 'Account not found' })
    return { success: true }
  })

  // ─── Test connection ───────────────────────────────────────────
  app.post('/api/accounts/:id/test', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const account = await getUserAccount(user.id, id)
    if (!account) return reply.code(404).send({ error: 'Account not found' })

    const { decrypt } = await import('../services/accounts.js')
    const pass = decrypt(account.auth_pass_encrypted)
    let smtp = false, imap = false

    try {
      const { createTransport } = await import('nodemailer')
      const t = createTransport({
        host: account.smtp_host, port: account.smtp_port,
        secure: account.smtp_port === 465,
        auth: { user: account.auth_user, pass },
        connectionTimeout: 10000,
      })
      await t.verify()
      t.close()
      smtp = true
    } catch {}

    try {
      const { ImapFlow } = await import('imapflow')
      const client = new ImapFlow({
        host: account.imap_host, port: account.imap_port, secure: true,
        auth: { user: account.auth_user, pass }, logger: false,
      })
      await client.connect()
      await client.logout()
      imap = true
    } catch {}

    return { smtp, imap }
  })

  // ─── Async sync with progress ───────────────────────────────────
  app.post('/api/accounts/:id/sync', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { mode?: string } || {}
    const mode = (body.mode === 'all' ? 'all' : 'nmp') as 'nmp' | 'all'
    const account = await getUserAccount(user.id, id)
    if (!account) return reply.code(404).send({ error: 'Account not found' })

    // Create task and start async sync
    const task = await createTask(user.id, `sync:${mode}`)

    // Run in background (don't await)
    syncAccountById(id, mode, async (progress, total) => {
      await updateTaskProgress(task.id, progress, total).catch(() => {})
    }).then(async (count) => {
      console.log(`[sync] Task ${task.id} completed: ${count} messages`)
      await completeTask(task.id, { new_messages: count, mode })
    }).catch(async (err) => {
      console.error(`[sync] Task ${task.id} failed:`, (err as Error).message)
      await failTask(task.id, (err as Error).message)
    })

    return { task_id: task.id }
  })

  // ─── Task progress ────────────────────────────────────────────
  app.get('/api/tasks/:id', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const task = await getTask(id)
    if (!task || task.user_id !== user.id) return reply.code(404).send({ error: 'Task not found' })
    return task
  })

  // ─── Clear messages for an account ─────────────────────────────
  app.delete('/api/accounts/:id/messages', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const account = await getUserAccount(user.id, id)
    if (!account) return reply.code(404).send({ error: 'Account not found' })

    const { run } = await import('../repositories/db.js')
    await run('DELETE FROM messages WHERE account_id = $1 AND user_id = $2', [id, user.id])
    return { success: true }
  })
}
