import type { FastifyInstance } from 'fastify'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { listUsers, banUser } from '../services/auth.js'
import { getAllSettings, setSetting } from '../services/settings.js'
import { queryOne, queryAll, run } from '../repositories/db.js'

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', requireAdmin)

  app.get('/api/admin/users', async () => {
    const users = await listUsers()
    return {
      users: users.map(u => ({
        id: u.id, email: u.email, name: u.name,
        is_admin: u.is_admin, is_banned: u.is_banned,
        created_at: u.created_at,
      })),
    }
  })

  app.post('/api/admin/users/:id/ban', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      await banUser(id, true)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.post('/api/admin/users/:id/unban', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      await banUser(id, false)
      return { success: true }
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.get('/api/admin/settings', async () => {
    return { settings: await getAllSettings() }
  })

  app.put('/api/admin/settings', async (req) => {
    const body = req.body as Record<string, string>
    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, value)
    }
    return { settings: await getAllSettings() }
  })

  app.get('/api/admin/status', async () => {
    const users = await queryOne('SELECT COUNT(*) as c FROM users')
    const accounts = await queryOne('SELECT COUNT(*) as c FROM email_accounts')
    const messages = await queryOne('SELECT COUNT(*) as c FROM messages')
    const keys = await queryOne('SELECT COUNT(*) as c FROM api_keys')

    return {
      version: '0.1.0',
      uptime: process.uptime(),
      counts: {
        users: parseInt(users?.c) || 0,
        email_accounts: parseInt(accounts?.c) || 0,
        messages: parseInt(messages?.c) || 0,
        api_keys: parseInt(keys?.c) || 0,
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    }
  })

  // ─── Data management ───────────────────────────────────────────

  // Delete all messages (keeps users and accounts)
  app.delete('/api/admin/messages', async () => {
    // Clean up attachment files
    try {
      const attachments = await queryAll('SELECT DISTINCT message_id FROM attachments')
      const { deleteAttachments } = await import('../services/attachments.js')
      for (const row of attachments) {
        try { await deleteAttachments(row.message_id) } catch {}
      }
    } catch {}
    await run('DELETE FROM thread_summaries')
    await run('DELETE FROM experience_packs')
    await run('DELETE FROM messages')
    // Update sync timestamp so stalwart-sync won't re-pull old emails
    await run('UPDATE email_accounts SET last_sync_at = NOW()')
    return { success: true, message: 'All messages deleted' }
  })

  // Full reset — delete everything except the current admin (requires password)
  app.post('/api/admin/reset', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = (req.body || {}) as { password?: string }

    if (!body?.password) {
      return reply.code(400).send({ error: 'Password required for reset' })
    }

    const row = await queryOne('SELECT password_hash FROM users WHERE id = $1', [user.id])
    if (!row) return reply.code(404).send({ error: 'User not found' })

    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(body.password, row.password_hash)
    if (!valid) return reply.code(403).send({ error: 'Invalid password' })

    console.warn(`[ADMIN-RESET] Executed by user=${user.id} at ${new Date().toISOString()}`)

    // Delete Stalwart mailboxes (except admin's)
    try {
      const { listMailboxes, deleteMailbox } = await import('../services/mailengine.js')
      const mailboxes = await listMailboxes()
      const adminUser = await queryOne('SELECT username FROM users WHERE id = $1', [user.id])
      for (const mb of mailboxes) {
        if (mb.name !== adminUser?.username && mb.name !== 'admin' && mb.name !== 'noreply') {
          try { await deleteMailbox(mb.name) } catch {}
        }
      }
    } catch (err) {
      console.warn('[ADMIN-RESET] Stalwart cleanup failed:', (err as Error).message)
    }

    await run('DELETE FROM thread_summaries')
    await run('DELETE FROM experience_packs')
    await run('DELETE FROM capsule_events')
    await run('DELETE FROM artifacts')
    await run('DELETE FROM capsule_runs')
    await run('DELETE FROM execution_capsules')
    await run('DELETE FROM verification_codes')
    await run('DELETE FROM tasks')
    await run('DELETE FROM messages')
    await run('DELETE FROM email_accounts')
    await run('DELETE FROM api_keys WHERE user_id != $1', [user.id])
    await run('DELETE FROM users WHERE id != $1', [user.id])
    await run('DELETE FROM server_settings')
    return { success: true, message: 'Server reset. Only your admin account remains.' }
  })
}
