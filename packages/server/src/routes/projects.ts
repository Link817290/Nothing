import type { FastifyInstance, FastifyRequest } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import { createProject, listProjects, getProject, updateProject, deleteProject } from '../services/projects.js'

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // List projects
  app.get('/api/projects', async (req: FastifyRequest) => {
    const projects = await listProjects(req.user!.id)
    return { projects }
  })

  // Create project
  app.post('/api/projects', async (req: FastifyRequest) => {
    const body = req.body as { name: string; description?: string }
    if (!body.name?.trim()) throw new Error('Project name is required')
    const project = await createProject(req.user!.id, body.name.trim(), body.description)
    return project
  })

  // Get project detail
  app.get('/api/projects/:id', async (req: FastifyRequest) => {
    const { id } = req.params as { id: string }
    const project = await getProject(req.user!.id, id)
    return project
  })

  // Update project
  app.put('/api/projects/:id', async (req: FastifyRequest) => {
    const { id } = req.params as { id: string }
    const body = req.body as { name?: string; description?: string }
    return updateProject(req.user!.id, id, body)
  })

  // Delete project — ?mode=unlink (default) or ?mode=delete_all
  app.delete('/api/projects/:id', async (req: FastifyRequest) => {
    const { id } = req.params as { id: string }
    const q = req.query as Record<string, string>
    const mode = q.mode === 'delete_all' ? 'delete_all' : 'unlink'
    return deleteProject(req.user!.id, id, mode as 'unlink' | 'delete_all')
  })
}
