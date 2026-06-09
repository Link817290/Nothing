import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import { listSages, getSage, searchSages, setFavorited, registerSage, listPublicSages } from '../services/sages.js'

export async function sageRoutes(app: FastifyInstance) {

  // ─── Public: user profile sages ────────────────────────────────
  app.get('/api/u/:username/sages', async (req) => {
    const { username } = req.params as { username: string }
    const sages = await listPublicSages(username)
    return { sages }
  })

  // ─── Authenticated ─────────────────────────────────────────────
  app.addHook('onRequest', authenticate)

  app.get('/api/sages', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    const sages = await listSages(user.id, {
      favorited: q.favorited === 'true' ? true : q.favorited === 'false' ? false : undefined,
      keyword: q.keyword,
    })
    return { sages: sages.map(formatSage) }
  })

  app.get('/api/sages/search', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as { q?: string }
    if (!q.q) return { sages: [] }
    const sages = await searchSages(user.id, q.q)
    return { sages: sages.map(formatSage) }
  })

  app.get('/api/sages/:id', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const sage = await getSage(user.id, id)
    if (!sage) return reply.code(404).send({ error: 'Sage not found' })
    return formatSage(sage)
  })

  app.post('/api/sages', async (req, reply) => {
    const user = (req as any).user as { id: string; email?: string }
    const body = req.body as { name: string; description?: string; version?: string; keywords?: string[]; sage_json?: any; public?: boolean }
    if (!body.name) return reply.code(400).send({ error: 'name required' })
    const id = await registerSage(user.id, body, (user as any).email)
    await setFavorited(user.id, id, true)
    return { success: true, sage_id: id }
  })

  // Update sage (publish/unpublish etc.)
  app.put('/api/sages/:id', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { public?: boolean; name?: string; description?: string }
    const sage = await getSage(user.id, id)
    if (!sage) return reply.code(404).send({ error: 'Sage not found' })
    const { run } = await import('../repositories/db.js')
    const updates: string[] = []
    const params: unknown[] = []
    let idx = 1
    if (body.public !== undefined) { updates.push(`public = $${idx}`); params.push(body.public); idx++ }
    if (body.name) { updates.push(`name = $${idx}`); params.push(body.name); idx++ }
    if (body.description !== undefined) { updates.push(`description = $${idx}`); params.push(body.description); idx++ }
    if (updates.length === 0) return { success: true }
    updates.push('updated_at = NOW()')
    params.push(id, user.id)
    await run(`UPDATE sages SET ${updates.join(', ')} WHERE id = $${idx} AND owner_user_id = $${idx + 1}`, params)
    return { success: true }
  })

  app.put('/api/sages/:id/favorite', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const sage = await getSage(user.id, id)
    if (!sage) return reply.code(404).send({ error: 'Sage not found' })
    await setFavorited(user.id, id, true)
    return { success: true }
  })

  app.put('/api/sages/:id/unfavorite', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const sage = await getSage(user.id, id)
    if (!sage) return reply.code(404).send({ error: 'Sage not found' })
    await setFavorited(user.id, id, false)
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
    public: row.public || false,
    favorited: row.favorited || false,
    keywords: row.keywords || [],
    sage_json: row.sage_json || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
