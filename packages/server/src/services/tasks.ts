import { randomBytes } from 'crypto'
import { queryOne, run } from '../repositories/db.js'

function genId() {
  return `task_${randomBytes(8).toString('base64url')}`
}

export interface Task {
  id: string
  user_id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  total: number
  result: any
  error: string | null
  created_at: string
  updated_at: string
}

export async function createTask(userId: string, type: string): Promise<Task> {
  const id = genId()
  await run(
    `INSERT INTO tasks (id, user_id, type, status) VALUES ($1, $2, $3, 'pending')`,
    [id, userId, type]
  )
  return (await getTask(id))!
}

export async function getTask(id: string): Promise<Task | null> {
  const row = await queryOne('SELECT * FROM tasks WHERE id = $1', [id])
  if (!row) return null
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    status: row.status,
    progress: row.progress,
    total: row.total,
    result: row.result,
    error: row.error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function updateTaskProgress(id: string, progress: number, total: number) {
  await run(
    `UPDATE tasks SET status = 'running', progress = $1, total = $2, updated_at = NOW() WHERE id = $3`,
    [progress, total, id]
  )
}

export async function completeTask(id: string, result: any) {
  await run(
    `UPDATE tasks SET status = 'completed', result = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(result), id]
  )
}

export async function failTask(id: string, error: string) {
  await run(
    `UPDATE tasks SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2`,
    [error, id]
  )
}
