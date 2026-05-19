import { getDb } from '../db.js'
import type { Database } from 'sql.js'
import type { ReportQuery, ReportResponse } from '@nothingmail/nmp/api'

function queryAll(db: Database, sql: string, params: unknown[] = []): Record<string, any>[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as any[])
  const results: Record<string, any>[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function queryOne(db: Database, sql: string, params: unknown[] = []): Record<string, any> | null {
  const stmt = db.prepare(sql)
  stmt.bind(params as any[])
  const result = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return result
}

function getPeriodDates(period: string): { start: string; end: string; label: string } {
  const now = new Date()
  const end = now.toISOString()
  let start: Date

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { start: start.toISOString(), end, label: 'Today' }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: start.toISOString(), end, label: 'This month' }
    case 'week':
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { start: start.toISOString(), end, label: 'Last 7 days' }
  }
}

export async function getReport(query: ReportQuery): Promise<ReportResponse> {
  const db = await getDb()
  const period = getPeriodDates(query.period || 'week')
  const projectFilter = query.project

  const where = `created_at >= ? ${projectFilter ? 'AND project = ?' : ''}`
  const params: unknown[] = [period.start]
  if (projectFilter) params.push(projectFilter)

  // Summary
  const sent = queryOne(db,
    `SELECT COUNT(*) as c FROM messages WHERE direction='outbound' AND ${where}`, params)
  const received = queryOne(db,
    `SELECT COUNT(*) as c FROM messages WHERE direction='inbound' AND ${where}`, params)
  const replied = queryOne(db,
    `SELECT COUNT(*) as c FROM messages WHERE status='replied' AND ${where}`, params)
  const failed = queryOne(db,
    `SELECT COUNT(*) as c FROM messages WHERE status='failed' AND ${where}`, params)

  // Projects breakdown
  const projects = queryAll(db,
    `SELECT project, COUNT(*) as messages,
       COUNT(DISTINCT thread_id) as threads,
       SUM(CASE WHEN status='replied' THEN 1 ELSE 0 END) as resolved
     FROM messages
     WHERE project IS NOT NULL AND ${where}
     GROUP BY project ORDER BY messages DESC`, params)

  // Needs reply (inbound, unread, type=question)
  const needsReply = queryAll(db,
    `SELECT id, from_address, subject, created_at, project
     FROM messages
     WHERE direction='inbound' AND is_read=0 AND ${where}
     ORDER BY created_at DESC LIMIT 10`, params)

  // Top threads
  const topThreads = queryAll(db,
    `SELECT thread_id, MIN(subject) as subject, COUNT(*) as message_count,
       MAX(status) as status, MAX(created_at) as last_activity
     FROM messages
     WHERE thread_id IS NOT NULL AND ${where}
     GROUP BY thread_id ORDER BY message_count DESC LIMIT 10`, params)

  return {
    period,
    summary: {
      sent: (sent?.c as number) || 0,
      received: (received?.c as number) || 0,
      replied: (replied?.c as number) || 0,
      failed: (failed?.c as number) || 0,
    },
    projects: projects.map(r => ({
      name: r.project as string,
      messages: r.messages as number,
      threads: r.threads as number,
      resolved: r.resolved as number,
    })),
    needs_reply: needsReply.map(r => ({
      id: r.id as string,
      from: r.from_address as string,
      subject: r.subject as string,
      date: r.created_at as string,
      project: (r.project as string) || undefined,
    })),
    top_threads: topThreads.map(r => ({
      thread_id: r.thread_id as string,
      subject: r.subject as string,
      message_count: r.message_count as number,
      status: r.status as string,
      last_activity: r.last_activity as string,
    })),
  }
}
