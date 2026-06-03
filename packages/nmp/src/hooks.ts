/**
 * Smart Envelope — Hooks
 *
 * Three hooks for the send/read/reply pipeline:
 * - preSendHook: auto-fill fields + route + gap detection
 * - postReadHook: inject contract prompts for reply
 * - preReplyHook: soft-validate against parent schema
 *
 * All hooks are pure functions (no IO). Caller provides parent via callback.
 * Hooks never block sending — gaps become hints for the agent.
 */

import type { NmpPayload, NmpContext } from './types.js'
import { decideRoute, ROUTE_CONTRACT, type Route, type RouteResult } from './routing.js'
import { extname } from 'path'

// ─── Tier-1: Deterministic auto-fill helpers ─────────────────────

const LANG_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java', '.rb': 'ruby',
  '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.cs': 'csharp', '.swift': 'swift',
  '.kt': 'kotlin', '.php': 'php', '.sh': 'bash', '.sql': 'sql', '.md': 'markdown',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.html': 'html', '.css': 'css', '.scss': 'scss', '.vue': 'vue', '.svelte': 'svelte',
}

function inferLanguage(filePath: string): string | undefined {
  const ext = extname(filePath).toLowerCase()
  return LANG_MAP[ext]
}

function inferContext(files?: string[]): NmpContext | undefined {
  if (!files || files.length === 0) return undefined
  const first = files[0]
  const lang = inferLanguage(first)
  return { file: first, language: lang }
}

/** Default expiry by type */
const EXPIRES_DEFAULTS: Record<string, number> = {
  'nmp:task': 7 * 24 * 3600_000,           // 7 days
  'nmp:approval': 3 * 24 * 3600_000,       // 3 days
  'nmp:code-review': 3 * 24 * 3600_000,    // 3 days
  'nmp:help-request': 7 * 24 * 3600_000,   // 7 days
}

function inferExpires(type?: string): string | undefined {
  if (!type) return undefined
  const ms = EXPIRES_DEFAULTS[type]
  if (!ms) return undefined
  return new Date(Date.now() + ms).toISOString()
}

// ─── Hook 1: preSendHook ─────────────────────────────────────────

export interface PreSendInput {
  text: string
  type?: string
  inReplyTo?: string | null
  files?: string[]
  parent?: NmpPayload | null
  agentId?: string
}

export interface PreSendResult {
  patch: Partial<NmpPayload>
  route: RouteResult
  hints: string[]
}

/**
 * Run before sending. Auto-fills deterministic fields (T1),
 * decides route, detects gaps → hints.
 */
export function preSendHook(input: PreSendInput): PreSendResult {
  const patch: Partial<NmpPayload> = {}
  const hints: string[] = []

  // T1: Agent identity
  if (input.agentId && !patch.agent) {
    patch.agent = input.agentId
  }

  // T1: Context from files
  if (input.files?.length) {
    const ctx = inferContext(input.files)
    if (ctx) patch.context = ctx
  }

  // T1: Default expires by type
  if (input.type) {
    const exp = inferExpires(input.type)
    if (exp) patch.expires = exp
  }

  // Route decision
  const hasArtifact = (input.files?.length || 0) > 0
  const route = decideRoute({
    inReplyTo: input.inReplyTo,
    parent: input.parent,
    hasArtifact,
    text: input.text,
  })

  // Field obligations from route
  const contract = ROUTE_CONTRACT[route.route]

  // Suggest: check what's missing
  for (const field of contract.suggest) {
    const parentHas = input.parent?.[field as keyof NmpPayload]
    const alreadySet = patch[field as keyof NmpPayload]
    if (!parentHas && !alreadySet) {
      hints.push(suggestHint(route.route, field))
    }
  }

  // Forbid: strip fields that shouldn't be here
  for (const field of contract.forbid) {
    if (patch[field as keyof NmpPayload]) {
      delete (patch as any)[field]
    }
  }

  // Route-specific hints
  if (route.needLLM) {
    hints.push(`Route="${route.route}" (confidence: ${route.confidence}). Consider if this is correct.`)
  }

  return { patch, route, hints }
}

function suggestHint(route: Route, field: string): string {
  const hints: Record<string, Record<string, string>> = {
    initiate: {
      help_request: 'This is a new request. Consider adding a help_request with goal and constraints.',
      reply_schema: 'Consider defining reply_schema so the response has the structure you need.',
      require: 'Consider specifying required capabilities for the recipient.',
    },
    deliver: {
      artifact: 'This looks like a delivery but has no artifact attached.',
    },
    revise: {
      artifact: 'This looks like a revision but has no artifact attached.',
    },
  }
  return hints[route]?.[field] || `Consider adding "${field}" for this ${route} message.`
}

// ─── Hook 2: postReadHook ────────────────────────────────────────

/**
 * Run after reading a message. Returns prompt lines to inject
 * at the top of the displayed content, making contracts visible.
 */
export function postReadHook(payload: NmpPayload): string[] {
  const lines: string[] = []

  if (payload.reply_schema) {
    const keys = Object.keys(payload.reply_schema.properties || payload.reply_schema)
    lines.push(`⚠️ The sender expects a structured reply:`)
    if (keys.length > 0) {
      lines.push(`   Required fields: ${keys.join(', ')}`)
    }
    lines.push(`   Your reply should conform to this schema.`)
  }

  if (payload.help_request) {
    const hr = payload.help_request
    lines.push(`💡 Help requested: ${hr.goal}`)
    if (hr.constraints?.length) {
      lines.push(`   Constraints: ${hr.constraints.join('; ')}`)
    }
    if (hr.expected_artifacts?.length) {
      lines.push(`   Expected: ${hr.expected_artifacts.map((a: any) => a.name).join(', ')}`)
    }
  }

  if (payload.require?.length) {
    lines.push(`🔑 Required capabilities: ${payload.require.join(', ')}`)
  }

  if (payload.expires) {
    const exp = new Date(payload.expires)
    const now = new Date()
    if (exp < now) {
      lines.push(`⏰ This message has EXPIRED (${payload.expires})`)
    } else {
      const hours = Math.round((exp.getTime() - now.getTime()) / 3600_000)
      lines.push(`⏰ Expires in ${hours}h (${payload.expires})`)
    }
  }

  return lines
}

// ─── Hook 3: preReplyHook ────────────────────────────────────────

export interface PreReplyResult {
  patch: Partial<NmpPayload>
  satisfies: boolean | null   // null = parent has no schema
  hints: string[]
}

/**
 * Run before replying. Soft-validates against parent's reply_schema,
 * inherits conversation_id, detects gaps.
 */
export function preReplyHook(
  text: string,
  files: string[] | undefined,
  parent: NmpPayload | null,
): PreReplyResult {
  const patch: Partial<NmpPayload> = {}
  const hints: string[] = []
  let satisfies: boolean | null = null

  if (!parent) return { patch, satisfies, hints }

  // Inherit conversation_id
  if (parent.conversation_id) {
    patch.conversation_id = parent.conversation_id
  }

  // Context from files
  if (files?.length) {
    const ctx = inferContext(files)
    if (ctx) patch.context = ctx
  }

  // Check reply_schema satisfaction
  if (parent.reply_schema) {
    const schema = parent.reply_schema
    const requiredKeys = Object.keys(schema.properties || schema)
    const textLower = text.toLowerCase()

    // Simple heuristic: check if text mentions required fields
    const missing = requiredKeys.filter(k => !textLower.includes(k.toLowerCase()))
    satisfies = missing.length === 0

    if (!satisfies) {
      hints.push(`Parent expects: ${requiredKeys.join(', ')}. Your reply may be missing: ${missing.join(', ')}.`)
    }
  }

  // Check help_request satisfaction
  if (parent.help_request?.expected_artifacts?.length && !files?.length) {
    hints.push(`Parent requested artifacts (${parent.help_request.expected_artifacts.map((a: any) => a.name).join(', ')}), but no files attached.`)
  }

  return { patch, satisfies, hints }
}
