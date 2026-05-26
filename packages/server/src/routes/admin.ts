import type { FastifyInstance } from 'fastify'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { listUsers, banUser } from '../services/auth.js'
import { getAllSettings, setSetting } from '../services/settings.js'
import { queryOne } from '../repositories/db.js'

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
}
