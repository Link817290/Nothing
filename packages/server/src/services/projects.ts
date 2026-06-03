import { randomBytes } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'

function genId() {
  return `proj_${randomBytes(6).toString('base64url')}`
}

export async function createProject(userId: string, name: string, description?: string) {
  const existing = await queryOne(
    `SELECT id FROM projects WHERE user_id = $1 AND name = $2`, [userId, name]
  )
  if (existing) throw new Error(`Project "${name}" already exists`)

  const id = genId()
  await run(
    `INSERT INTO projects (id, user_id, name, description) VALUES ($1, $2, $3, $4)`,
    [id, userId, name, description || null]
  )
  return { id, name, description }
}

export async function listProjects(userId: string) {
  const projects = await queryAll(
    `SELECT p.id, p.name, p.description, p.created_at,
       (SELECT COUNT(*) FROM messages m WHERE m.user_id = p.user_id AND m.project = p.name) as message_count,
       (SELECT COUNT(DISTINCT thread_id) FROM messages m WHERE m.user_id = p.user_id AND m.project = p.name AND m.thread_id IS NOT NULL) as thread_count,
       (SELECT COUNT(*) FROM messages m WHERE m.user_id = p.user_id AND m.project = p.name AND m.is_read = FALSE AND m.direction = 'inbound') as unread
     FROM projects p WHERE p.user_id = $1 ORDER BY p.updated_at DESC`,
    [userId]
  )
  return projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    created_at: p.created_at,
    message_count: parseInt(p.message_count) || 0,
    thread_count: parseInt(p.thread_count) || 0,
    unread: parseInt(p.unread) || 0,
  }))
}

export async function getProject(userId: string, idOrName: string) {
  const project = await queryOne(
    `SELECT * FROM projects WHERE user_id = $1 AND (id = $2 OR name = $2)`, [userId, idOrName]
  )
  if (!project) throw new Error('Project not found')
  return project
}

export async function updateProject(userId: string, id: string, data: { name?: string; description?: string }) {
  const project = await queryOne(`SELECT * FROM projects WHERE id = $1 AND user_id = $2`, [id, userId])
  if (!project) throw new Error('Project not found')

  if (data.name && data.name !== project.name) {
    const dup = await queryOne(`SELECT id FROM projects WHERE user_id = $1 AND name = $2`, [userId, data.name])
    if (dup) throw new Error(`Project "${data.name}" already exists`)

    // Rename project in all messages
    await run(`UPDATE messages SET project = $1 WHERE user_id = $2 AND project = $3`, [data.name, userId, project.name])
  }

  await run(
    `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3`,
    [data.name || null, data.description !== undefined ? data.description : null, id]
  )
  return { success: true }
}

export async function deleteProject(userId: string, id: string) {
  const project = await queryOne(`SELECT * FROM projects WHERE id = $1 AND user_id = $2`, [id, userId])
  if (!project) throw new Error('Project not found')

  // Clear project tag from messages (don't delete messages)
  await run(`UPDATE messages SET project = NULL WHERE user_id = $1 AND project = $2`, [userId, project.name])
  await run(`DELETE FROM projects WHERE id = $1`, [id])
  return { success: true }
}

/** Validate that a project name exists for this user */
export async function validateProject(userId: string, projectName: string): Promise<boolean> {
  const row = await queryOne(`SELECT id FROM projects WHERE user_id = $1 AND name = $2`, [userId, projectName])
  return !!row
}
