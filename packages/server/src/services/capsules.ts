import { randomBytes } from 'crypto'
import { queryAll, queryOne, run } from '../repositories/db.js'
import type { NmpExecutionCapsule, NmpCapsuleEvent } from '@nothingmail/nmp'

function genId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString('base64url')}`
}

// ─── Capsules ─────────────────────────────────────────────────

export async function saveCapsule(userId: string, messageId: string, capsule: NmpExecutionCapsule) {
  const existing = await queryOne('SELECT id FROM execution_capsules WHERE id = $1', [capsule.id])
  if (existing) {
    await run(
      `UPDATE execution_capsules SET capsule_json = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(capsule), capsule.id]
    )
    return capsule.id
  }

  await run(
    `INSERT INTO execution_capsules (id, owner_user_id, source_message_id, name, version, description, capsule_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [capsule.id, userId, messageId, capsule.name, capsule.version, capsule.description || null, JSON.stringify(capsule)]
  )
  return capsule.id
}

export async function listCapsules(userId: string) {
  return queryAll(
    'SELECT id, name, version, description, created_at FROM execution_capsules WHERE owner_user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
}

export async function getCapsule(userId: string, id: string): Promise<NmpExecutionCapsule | null> {
  const row = await queryOne(
    'SELECT * FROM execution_capsules WHERE id = $1 AND owner_user_id = $2',
    [id, userId]
  )
  if (!row) return null
  return typeof row.capsule_json === 'string' ? JSON.parse(row.capsule_json) : row.capsule_json
}

// ─── Runs ─────────────────────────────────────────────────────

export async function createRun(userId: string, capsuleId: string, inputs?: Record<string, unknown>, helpRequestMessageId?: string) {
  const capsule = await getCapsule(userId, capsuleId)
  if (!capsule) throw new Error('Capsule not found')

  const id = genId('run')
  const initialState = capsule.state_machine.initial

  await run(
    `INSERT INTO capsule_runs (id, user_id, capsule_id, status, current_state, run_json, inputs)
     VALUES ($1, $2, $3, 'running', $4, $5, $6)`,
    [id, userId, capsuleId, initialState, JSON.stringify({ capsule_version: capsule.version }), inputs ? JSON.stringify(inputs) : null]
  )

  // Record initial state entered event
  await appendEvent(userId, id, {
    id: genId('evt'),
    run_id: id,
    type: 'state_entered',
    state: initialState,
    message: `Entered initial state: ${initialState}`,
    created_at: new Date().toISOString(),
  })

  return { id, capsule_id: capsuleId, status: 'running', current_state: initialState, capsule }
}

export async function getRun(userId: string, runId: string) {
  const row = await queryOne(
    'SELECT * FROM capsule_runs WHERE id = $1 AND user_id = $2',
    [runId, userId]
  )
  if (!row) return null
  return {
    id: row.id,
    capsule_id: row.capsule_id,
    status: row.status,
    current_state: row.current_state,
    inputs: row.inputs,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  }
}

export async function getRunWithCapsule(userId: string, runId: string) {
  const r = await getRun(userId, runId)
  if (!r) return null
  const capsule = await getCapsule(userId, r.capsule_id)
  return { ...r, capsule }
}

export async function updateRunState(userId: string, runId: string, newState: string, status?: string) {
  const updates: string[] = ['current_state = $3', 'updated_at = NOW()']
  const params: unknown[] = [runId, userId, newState]
  let idx = 4

  if (status) {
    updates.push(`status = $${idx}`)
    params.push(status)
    idx++
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.push('completed_at = NOW()')
    }
  }

  await run(
    `UPDATE capsule_runs SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2`,
    params
  )
}

// ─── Events ───────────────────────────────────────────────────

export async function appendEvent(userId: string, runId: string, event: NmpCapsuleEvent) {
  const id = event.id || genId('evt')
  await run(
    `INSERT INTO capsule_events (id, run_id, user_id, event_type, state, message, event_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, runId, userId, event.type, event.state || null, event.message || null, JSON.stringify(event.data || {})]
  )
  return id
}

export async function listEvents(userId: string, runId: string) {
  return queryAll(
    'SELECT * FROM capsule_events WHERE run_id = $1 AND user_id = $2 ORDER BY created_at ASC',
    [runId, userId]
  )
}

// ─── Guard Command ────────────────────────────────────────────

export function guardCommand(capsule: NmpExecutionCapsule, currentState: string, command: string): { effect: 'allow' | 'deny' | 'confirm'; reason: string } {
  const policy = capsule.tool_policy
  const state = capsule.state_machine.states[currentState]
  const cmd = command.trim().replace(/\s+/g, ' ')

  // Check command rules first (most specific)
  if (policy.command_rules) {
    for (const rule of policy.command_rules) {
      if (new RegExp(rule.pattern).test(cmd)) {
        return { effect: rule.effect, reason: rule.reason }
      }
    }
  }

  // Check deny list
  if (policy.deny) {
    for (const d of policy.deny) {
      if (cmd.includes(d) || new RegExp(d).test(cmd)) {
        return { effect: 'deny', reason: `Blocked by deny rule: ${d}` }
      }
    }
  }

  // Check require_confirm
  if (policy.require_confirm) {
    for (const c of policy.require_confirm) {
      if (cmd.includes(c) || new RegExp(c).test(cmd)) {
        return { effect: 'confirm', reason: `Requires confirmation: ${c}` }
      }
    }
  }

  // Check state-level allowed tools
  if (state?.allowed_tools?.length) {
    const tool = cmd.split(' ')[0]
    if (!state.allowed_tools.some(t => tool.includes(t))) {
      return { effect: 'deny', reason: `Tool "${tool}" not allowed in state "${currentState}". Allowed: ${state.allowed_tools.join(', ')}` }
    }
  }

  // Check global allow list
  const tool = cmd.split(' ')[0]
  if (policy.allow.length > 0 && !policy.allow.some(a => tool.includes(a))) {
    return { effect: 'deny', reason: `Tool "${tool}" not in allow list: ${policy.allow.join(', ')}` }
  }

  return { effect: 'allow', reason: 'Permitted by policy' }
}

// ─── Artifacts ────────────────────────────────────────────────

export async function createArtifact(userId: string, opts: {
  runId?: string; messageId?: string; attachmentId?: string
  name: string; type: string; mimeType?: string; sha256?: string; size?: number
  provenance?: Record<string, unknown>
}) {
  const id = genId('art')
  await run(
    `INSERT INTO artifacts (id, user_id, run_id, message_id, attachment_id, name, type, mime_type, sha256, size, provenance_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, userId, opts.runId || null, opts.messageId || null, opts.attachmentId || null,
     opts.name, opts.type, opts.mimeType || null, opts.sha256 || null, opts.size || null,
     opts.provenance ? JSON.stringify(opts.provenance) : null]
  )
  return id
}

export async function listArtifacts(userId: string, runId?: string) {
  if (runId) {
    return queryAll('SELECT * FROM artifacts WHERE user_id = $1 AND run_id = $2 ORDER BY created_at', [userId, runId])
  }
  return queryAll('SELECT * FROM artifacts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId])
}
