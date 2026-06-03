/**
 * Organize Agent — analyzes unorganized threads and suggests project groupings.
 * Streams suggestions one-by-one via SSE for live rendering.
 */

import { queryAll } from '../../repositories/db.js'
import { llmStream, llmChat, parseJsonResponse } from './llm.js'

export interface ThreadInfo {
  thread_id: string
  subject: string
  from: string
  message_count: number
}

export interface OrganizeSuggestion {
  project_name: string
  description: string
  reason: string
  thread_ids: string[]
  threads: ThreadInfo[]
  is_new_project: boolean
}

/** Get all threads without a project for this user */
async function getUnorganizedThreads(userId: string) {
  return queryAll(`
    SELECT
      m.thread_id,
      MIN(m.subject) as subject,
      MIN(m.from_address) as from_address,
      COUNT(*) as message_count,
      MAX(m.created_at) as last_activity,
      STRING_AGG(DISTINCT m.from_address, ', ') as participants,
      LEFT(MIN(m.content), 200) as preview
    FROM messages m
    WHERE m.user_id = $1
      AND m.thread_id IS NOT NULL
      AND m.project IS NULL
    GROUP BY m.thread_id
    HAVING COUNT(*) >= 1
    ORDER BY MAX(m.created_at) DESC
    LIMIT 100
  `, [userId])
}

async function getExistingProjects(userId: string) {
  return queryAll(
    `SELECT name, description FROM projects WHERE user_id = $1`,
    [userId]
  )
}

function buildPrompt(
  threads: Record<string, any>[],
  existingProjects: Record<string, any>[]
): string {
  const threadList = threads.map((t, i) => {
    const from = t.from_address?.split('@')[0] || 'unknown'
    const participants = t.participants || from
    return `[${i}] thread_id="${t.thread_id}" subject="${t.subject}" from=${participants} msgs=${t.message_count} preview="${(t.preview || '').slice(0, 100)}"`
  }).join('\n')

  const projectList = existingProjects.length > 0
    ? existingProjects.map(p => `- "${p.name}"${p.description ? `: ${p.description}` : ''}`).join('\n')
    : '(none)'

  return `You are an email organizer. Analyze these unorganized email threads and suggest how to group them into projects.

EXISTING PROJECTS:
${projectList}

UNORGANIZED THREADS:
${threadList}

RULES:
1. Group related threads by topic, sender pattern, or conversation theme
2. Prefer assigning to existing projects when they match
3. Suggest new project names only when no existing project fits
4. A thread can only belong to one project
5. Some threads may not fit any group — leave them out
6. Project names should be short (2-4 words), descriptive
7. Use the same language as the thread subjects

IMPORTANT: Output a JSON array. Each element is one suggestion object:
[
  {"project_name": "...", "description": "...", "reason": "...", "thread_ids": ["..."], "is_new_project": true},
  ...
]
Output the array directly, no wrapper object.`
}

/** Enrich a raw suggestion with thread info */
function enrichSuggestion(
  raw: any,
  threadMap: Map<string, Record<string, any>>,
  existingProjects: Record<string, any>[]
): OrganizeSuggestion | null {
  const validIds = (raw.thread_ids || []).filter((id: string) => threadMap.has(id))
  if (validIds.length === 0) return null

  return {
    project_name: raw.project_name || 'Untitled',
    description: raw.description || '',
    reason: raw.reason || '',
    thread_ids: validIds,
    threads: validIds.map((id: string) => {
      const t = threadMap.get(id)!
      return {
        thread_id: id,
        subject: t.subject || '(no subject)',
        from: (t.from_address || '').split('@')[0],
        message_count: parseInt(t.message_count) || 1,
      }
    }),
    is_new_project: !existingProjects.some(p => p.name === raw.project_name),
  }
}

/**
 * Stream organize suggestions. Yields events:
 * - { type: 'meta', unorganized_count } — initial info
 * - { type: 'thinking', text } — raw LLM output chunk for live display
 * - { type: 'suggestion', data: OrganizeSuggestion } — parsed suggestion
 * - { type: 'done' } — finished
 * - { type: 'error', message } — error
 */
export async function* organizeStream(userId: string): AsyncGenerator<{
  type: 'meta' | 'thinking' | 'suggestion' | 'done' | 'error'
  [key: string]: any
}> {
  const threads = await getUnorganizedThreads(userId)
  if (threads.length === 0) {
    yield { type: 'meta', unorganized_count: 0 }
    yield { type: 'done' }
    return
  }

  const existingProjects = await getExistingProjects(userId)
  const threadMap = new Map(threads.map(t => [t.thread_id, t]))

  yield { type: 'meta', unorganized_count: threads.length }

  const prompt = buildPrompt(threads, existingProjects)

  try {
    let fullText = ''

    for await (const chunk of llmStream({
      messages: [
        { role: 'system', content: 'You are an intelligent email organizer. Output a valid JSON array only. Be concise.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 2048,
      temperature: 0.2,
    })) {
      fullText += chunk
      yield { type: 'thinking', text: chunk }

      // Try to extract complete suggestion objects as they appear
      // Look for complete {...} objects in the accumulated text
      const extracted = tryExtractSuggestions(fullText, threadMap, existingProjects)
      for (const sug of extracted.newSuggestions) {
        yield { type: 'suggestion', data: sug }
      }
    }

    // Final parse — extract any remaining suggestions
    try {
      const cleaned = fullText.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(cleaned)
      const arr = Array.isArray(parsed) ? parsed : parsed.suggestions || []
      for (const raw of arr) {
        const sug = enrichSuggestion(raw, threadMap, existingProjects)
        if (sug) yield { type: 'suggestion', data: sug }
      }
    } catch {
      // Already yielded incrementally, ok to fail final parse
    }

    yield { type: 'done' }
  } catch (err) {
    yield { type: 'error', message: (err as Error).message }
  }
}

// ─── Incremental JSON extraction ──────────────────────────────

const emittedIds = new Set<string>()

function tryExtractSuggestions(
  text: string,
  threadMap: Map<string, Record<string, any>>,
  existingProjects: Record<string, any>[]
): { newSuggestions: OrganizeSuggestion[] } {
  const newSuggestions: OrganizeSuggestion[] = []

  // Find complete JSON objects {...} in the text
  let depth = 0
  let start = -1

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i
      depth++
    } else if (text[i] === '}') {
      depth--
      if (depth === 0 && start >= 0) {
        const jsonStr = text.slice(start, i + 1)
        try {
          const obj = JSON.parse(jsonStr)
          if (obj.project_name && obj.thread_ids) {
            const key = obj.project_name + '|' + obj.thread_ids.join(',')
            if (!emittedIds.has(key)) {
              const sug = enrichSuggestion(obj, threadMap, existingProjects)
              if (sug) {
                emittedIds.add(key)
                newSuggestions.push(sug)
              }
            }
          }
        } catch {}
        start = -1
      }
    }
  }

  return { newSuggestions }
}

/** Reset emitted tracking (call before each new organize session) */
export function resetOrganizeState() {
  emittedIds.clear()
}
