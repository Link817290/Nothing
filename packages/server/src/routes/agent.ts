import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import { organizeStream, resetOrganizeState } from '../services/agent/organize.js'
import { run, queryOne } from '../repositories/db.js'

export async function agentRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // ─── Organize: stream suggestions via SSE ───────────────────
  app.post('/api/agent/organize', async (req, reply) => {
    const user = (req as any).user as { id: string }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    try {
      resetOrganizeState()
      const seenSuggestions = new Set<string>()

      for await (const event of organizeStream(user.id)) {
        // Deduplicate suggestions (stream may emit from incremental + final parse)
        if (event.type === 'suggestion') {
          const key = event.data.project_name + '|' + event.data.thread_ids.join(',')
          if (seenSuggestions.has(key)) continue
          seenSuggestions.add(key)
        }
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } catch (err) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`)
    }

    reply.raw.write(`data: [DONE]\n\n`)
    reply.raw.end()
  })

  // ─── Organize: apply confirmed suggestions ──────────────────
  app.post('/api/agent/organize/apply', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as {
      actions: {
        project_name: string
        description?: string
        thread_ids: string[]
        is_new_project: boolean
      }[]
    }

    if (!body.actions?.length) {
      return reply.code(400).send({ error: 'No actions provided' })
    }

    let created = 0
    let assigned = 0

    for (const action of body.actions) {
      // Create project if new
      if (action.is_new_project) {
        const existing = await queryOne(
          'SELECT id FROM projects WHERE user_id = $1 AND name = $2',
          [user.id, action.project_name]
        )
        if (!existing) {
          const { createProject } = await import('../services/projects.js')
          await createProject(user.id, action.project_name, action.description)
          created++
        }
      }

      // Assign threads to project
      for (const threadId of action.thread_ids) {
        await run(
          `UPDATE messages SET project = $1, updated_at = NOW()
           WHERE thread_id = $2 AND user_id = $3`,
          [action.project_name, threadId, user.id]
        )
        assigned++
      }
    }

    return { success: true, projects_created: created, threads_assigned: assigned }
  })

  // ─── Remove thread from project ─────────────────────────────
  app.delete('/api/threads/:id/project', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }

    const msg = await queryOne(
      'SELECT id FROM messages WHERE thread_id = $1 AND user_id = $2 LIMIT 1',
      [id, user.id]
    )
    if (!msg) return reply.code(404).send({ error: 'Thread not found' })

    await run(
      `UPDATE messages SET project = NULL, updated_at = NOW()
       WHERE thread_id = $1 AND user_id = $2`,
      [id, user.id]
    )

    return { success: true }
  })

  // ─── Assign thread to project (manual) ──────────────────────
  app.put('/api/threads/:id/project', async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { project: string }

    if (!body.project) return reply.code(400).send({ error: 'project required' })

    // Verify project exists
    const project = await queryOne(
      'SELECT id FROM projects WHERE user_id = $1 AND name = $2',
      [user.id, body.project]
    )
    if (!project) return reply.code(404).send({ error: 'Project not found' })

    await run(
      `UPDATE messages SET project = $1, updated_at = NOW()
       WHERE thread_id = $2 AND user_id = $3`,
      [body.project, id, user.id]
    )

    return { success: true }
  })
}
