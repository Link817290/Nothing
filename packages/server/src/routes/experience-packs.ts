import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import { listPacks, getPack, searchPacks, setInstalled, registerPack } from '../services/experience-packs.js'
import { getCapsule } from '../services/capsules.js'

export async function experiencePackRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // List experience packs
  app.get('/api/experience-packs', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as Record<string, string>
    const packs = await listPacks(user.id, {
      installed: q.installed === 'true' ? true : q.installed === 'false' ? false : undefined,
      keyword: q.keyword,
    })
    return { packs: packs.map(formatPack) }
  })

  // Search by keyword
  app.get('/api/experience-packs/search', async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as { q?: string }
    if (!q.q) return { packs: [] }
    const packs = await searchPacks(user.id, q.q)
    return { packs: packs.map(formatPack) }
  })

  // Get single pack (with capsule details)
  app.get('/api/experience-packs/:id', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const pack = await getPack(user.id, id)
    if (!pack) return reply.code(404).send({ error: 'Experience pack not found' })

    const capsule = await getCapsule(user.id, pack.capsule_id)

    return {
      ...formatPack(pack),
      capsule: capsule || undefined,
    }
  })

  // Save (register from capsule) — receiver explicitly saves a capsule as experience pack
  app.post('/api/experience-packs', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as { capsule_id?: string; message_id?: string }
    const lookupId = body.capsule_id || body.message_id
    if (!lookupId) return reply.code(400).send({ error: 'capsule_id or message_id required' })

    const capsule = await getCapsule(user.id, lookupId)
    if (!capsule) return reply.code(404).send({ error: 'Capsule not found' })

    // Find source message for metadata
    const { queryOne } = await import('../repositories/db.js')
    const capsuleRow = await queryOne(
      'SELECT source_message_id FROM execution_capsules WHERE id = $1',
      [capsule.id],
    )
    const sourceMessageId = capsuleRow?.source_message_id || body.message_id || null

    let authorEmail: string | undefined
    if (sourceMessageId) {
      const msg = await queryOne('SELECT from_address FROM messages WHERE id = $1', [sourceMessageId])
      authorEmail = msg?.from_address
    }

    const packId = await registerPack(user.id, capsule.id, sourceMessageId, {
      id: capsule.id,
      name: capsule.name,
      kind: 'execution_capsule',
      installable: true,
      runnable: true,
      activation: { keywords: capsule.activation?.keywords || [] },
      source: { message_id: sourceMessageId, author: authorEmail },
    }, authorEmail)

    // Auto-mark as installed
    await setInstalled(user.id, packId, true)

    return { success: true, pack_id: packId }
  })

  // Install (toggle installed flag; auto-register from capsule if pack doesn't exist yet)
  app.put('/api/experience-packs/:id/install', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    let pack = await getPack(user.id, id)

    // If pack doesn't exist, try to create from capsule
    if (!pack) {
      const capsule = await getCapsule(user.id, id)
      if (!capsule) return reply.code(404).send({ error: 'Experience pack or capsule not found' })

      const { queryOne } = await import('../repositories/db.js')
      const capsuleRow = await queryOne(
        'SELECT source_message_id FROM execution_capsules WHERE id = $1',
        [capsule.id],
      )

      await registerPack(user.id, capsule.id, capsuleRow?.source_message_id, {
        id: capsule.id,
        name: capsule.name,
        kind: 'execution_capsule',
        installable: true,
        runnable: true,
        activation: { keywords: capsule.activation?.keywords || [] },
      })
      pack = await getPack(user.id, capsule.id)
    }

    if (pack) await setInstalled(user.id, pack.id, true)
    return { success: true }
  })

  // Uninstall
  app.put('/api/experience-packs/:id/uninstall', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const pack = await getPack(user.id, id)
    if (!pack) return reply.code(404).send({ error: 'Experience pack not found' })
    await setInstalled(user.id, id, false)
    return { success: true }
  })
}

function formatPack(row: Record<string, any>) {
  return {
    id: row.id,
    capsule_id: row.capsule_id,
    name: row.name,
    version: row.version || null,
    kind: row.kind,
    description: row.description,
    author_email: row.author_email,
    installable: row.installable,
    runnable: row.runnable,
    installed: row.installed,
    keywords: row.keywords || [],
    source_message_id: row.source_message_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
