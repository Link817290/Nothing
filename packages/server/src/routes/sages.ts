import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import { listSages, getSage, searchSages, setInstalled, registerSage } from '../services/sages.js'

export async function sageRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // List sages
  app.get('/api/sages', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    const sages = await listSages(user.id, {
      installed: q.installed === 'true' ? true : q.installed === 'false' ? false : undefined,
      keyword: q.keyword,
    })
    return { sages: sages.map(formatSage) }
  })

  // Search
  app.get('/api/sages/search', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as { q?: string }
    if (!q.q) return { sages: [] }
    const sages = await searchSages(user.id, q.q)
    return { sages: sages.map(formatSage) }
  })

  // Get single
  app.get('/api/sages/:id', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const sage = await getSage(user.id, id)
    if (!sage) return reply.code(404).send({ error: 'Sage not found' })
    return formatSage(sage)
  })

  // Register a new sage
  app.post('/api/sages', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as { name: string; description?: string; version?: string; keywords?: string[]; sage_json?: any }
    if (!body.name) return reply.code(400).send({ error: 'name required' })
    const id = await registerSage(user.id, body)
    await setInstalled(user.id, id, true)
    return { success: true, sage_id: id }
  })

  // Install
  app.put('/api/sages/:id/install', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const sage = await getSage(user.id, id)
    if (!sage) return reply.code(404).send({ error: 'Sage not found' })
    await setInstalled(user.id, id, true)
    return { success: true }
  })

  // Uninstall
  app.put('/api/sages/:id/uninstall', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const sage = await getSage(user.id, id)
    if (!sage) return reply.code(404).send({ error: 'Sage not found' })
    await setInstalled(user.id, id, false)
    return { success: true }
  })
}

function formatSage(row: Record<string, any>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    author_email: row.author_email,
    installed: row.installed,
    keywords: row.keywords || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
