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

/** Extract file extension (no dependency on node:path — works in browser too) */
function extname(filePath: string): string {
  const base = filePath.split(/[/\\]/).pop() || ''
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot) : ''
}

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
  const ctx: NmpContext = { file: first, language: lang }
  if (files.length > 1) {
    ctx.file = files.join(', ')
    // Use language from first file that has a recognized extension
    for (const f of files) {
      const l = inferLanguage(f)
      if (l) { ctx.language = l; break }
    }
  }
  return ctx
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
  parentHasArtifact?: boolean   // whether parent had attachments
  agentId?: string
  explicitContext?: boolean     // true if caller already set context
  explicitExpires?: boolean     // true if caller already set expires
  explicitFields?: Partial<NmpPayload>  // fields the agent explicitly passed (for forbid check)
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

  // T1: Agent identity (only if not already set by caller)
  if (input.agentId) {
    patch.agent = input.agentId
  }

  // T1: Context from files (only if caller didn't provide explicit context)
  if (input.files?.length && !input.explicitContext) {
    const ctx = inferContext(input.files)
    if (ctx) patch.context = ctx
  }

  // T1: Default expires by type (only if caller didn't set explicit expires)
  if (input.type && !input.explicitExpires) {
    const exp = inferExpires(input.type)
    if (exp) patch.expires = exp
  }

  // Route decision
  const hasArtifact = (input.files?.length || 0) > 0
  const route = decideRoute({
    inReplyTo: input.inReplyTo,
    parent: input.parent,
    parentHasArtifact: input.parentHasArtifact,
    hasArtifact,
    text: input.text,
  })

  // Field obligations from route
  const contract = ROUTE_CONTRACT[route.route]

  // Suggest: check what's missing — but ONLY for structured types
  // Plain chat/discuss/acknowledge should never suggest rich fields
  const isStructuredType = input.type && !['nmp:chat', 'nmp:notification'].includes(input.type)
  if (isStructuredType || input.parent?.reply_schema || input.parent?.help_request) {
    for (const field of contract.suggest) {
      const parentHas = input.parent?.[field as keyof NmpPayload]
      const alreadySet = patch[field as keyof NmpPayload]
      if (!parentHas && !alreadySet) {
        hints.push(suggestHint(route.route, field))
      }
    }
  }

  // Forbid: strip from patch AND warn if agent explicitly passed them
  for (const field of contract.forbid) {
    if (patch[field as keyof NmpPayload]) {
      delete (patch as any)[field]
    }
    if (input.explicitFields?.[field as keyof NmpPayload]) {
      hints.push(`Field "${field}" is not appropriate for ${route.route} messages and will be ignored.`)
    }
  }

  // Route-specific hints — when needLLM, agent should confirm from closed set
  if (route.needLLM) {
    hints.push(`Suggested route="${route.route}". Confirm or pick: initiate / deliver / revise / discuss / acknowledge.`)
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
export function postReadHook(payload: NmpPayload | null | undefined): string[] {
  if (!payload || typeof payload !== 'object') return []

  const lines: string[] = []

  if (payload.reply_schema) {
    const props = payload.reply_schema.properties
    const keys = props && typeof props === 'object' ? Object.keys(props) : []
    lines.push(`⚠️ The sender expects a structured reply:`)
    if (keys.length > 0) {
      lines.push(`   Required fields: ${keys.join(', ')}`)
    }
    lines.push(`   Your reply should conform to this schema.`)
  }

  if (payload.help_request) {
    const hr = payload.help_request
    if (hr.goal) lines.push(`💡 Help requested: ${hr.goal}`)
    if (hr.constraints?.length) {
      lines.push(`   Constraints: ${hr.constraints.join('; ')}`)
    }
    if (hr.expected_artifacts?.length) {
      lines.push(`   Expected: ${hr.expected_artifacts.map((a: any) => a.name).join(', ')}`)
    }
  }

  if (payload.execution_capsule) {
    const cap = payload.execution_capsule
    lines.push(`📦 Execution Capsule: ${cap.name || 'unnamed'} v${cap.version || '?'}`)
    if (cap.description) lines.push(`   ${cap.description}`)
    lines.push(`   Use nothing_capsule_inspect to view state machine and tool policy.`)
  }

  if (payload.experience_pack) {
    const pack = payload.experience_pack
    lines.push(`📦 Experience Pack: ${pack.name || 'unnamed'} [${pack.id}]`)
    if (pack.activation?.keywords?.length) lines.push(`   Keywords: ${pack.activation.keywords.join(', ')}`)
    lines.push(`   Use nothing_experience_packs to browse, or install via nothing_experience_pack_search.`)
  }

  if (payload.ack) {
    lines.push(`📨 The sender requests a delivery acknowledgment. Send a brief confirmation after reading.`)
  }

  if (payload.require?.length) {
    lines.push(`🔑 Required capabilities: ${payload.require.join(', ')}`)
  }

  if (payload.expires) {
    const exp = new Date(payload.expires)
    if (isNaN(exp.getTime())) {
      // Invalid date — skip
    } else {
      const now = new Date()
      if (exp < now) {
        lines.push(`⏰ This message has EXPIRED (${payload.expires})`)
      } else {
        const hours = Math.round((exp.getTime() - now.getTime()) / 3600_000)
        if (hours <= 24) {
          lines.push(`⏰ URGENT: Expires in ${hours}h`)
        } else {
          const days = Math.round(hours / 24)
          lines.push(`⏰ Expires in ${days}d (${payload.expires})`)
        }
      }
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
  parent: NmpPayload | null | undefined,
  callerFields?: { project?: string; labels?: string[] },
): PreReplyResult {
  const patch: Partial<NmpPayload> = {}
  const hints: string[] = []
  let satisfies: boolean | null = null

  if (!parent || typeof parent !== 'object') return { patch, satisfies, hints }

  // Inherit conversation_id from parent
  if (parent.conversation_id) patch.conversation_id = parent.conversation_id

  // Thread belongs to one project — always inherit from parent, cannot override
  if (parent.project) {
    patch.project = parent.project
    if (callerFields?.project && callerFields.project !== parent.project) {
      hints.push(`Project forced to "${parent.project}" (inherited from thread). Cannot change project within a thread.`)
    }
  }

  // Labels: inherit from parent if caller didn't set
  if (parent.labels?.length && !callerFields?.labels?.length) patch.labels = parent.labels

  // Context from files
  if (files?.length) {
    const ctx = inferContext(files)
    if (ctx) patch.context = ctx
  }

  // Warn if parent has expired
  if (parent.expires) {
    const exp = new Date(parent.expires)
    if (!isNaN(exp.getTime()) && exp < new Date()) {
      hints.push(`Warning: the parent message has expired (${parent.expires}). Your reply may no longer be relevant.`)
    }
  }

  // Check reply_schema satisfaction
  if (parent.reply_schema) {
    const props = parent.reply_schema.properties
    if (props && typeof props === 'object') {
      const requiredKeys = Object.keys(props)
      const textLower = text.toLowerCase()

      // Check each key — must appear as a standalone word/field reference,
      // not just as a substring (e.g., "not approved" should not match "approved" positively)
      // This is still a heuristic; real validation is the agent's job
      const missing = requiredKeys.filter(k => {
        const keyLower = k.toLowerCase()
        // Look for "key:" or "key =" or the key as a word boundary
        const patterns = [
          new RegExp(`\\b${escapeRegex(keyLower)}\\b`),
          new RegExp(`${escapeRegex(keyLower)}\\s*[:=]`),
        ]
        return !patterns.some(p => p.test(textLower))
      })
      satisfies = missing.length === 0

      if (!satisfies) {
        hints.push(`Parent expects: ${requiredKeys.join(', ')}. Your reply may be missing: ${missing.join(', ')}.`)
      }
    } else {
      // reply_schema exists but has no properties — can't validate
      satisfies = null
    }
  }

  // Check help_request satisfaction
  if (parent.help_request?.expected_artifacts?.length && !files?.length) {
    hints.push(`Parent requested artifacts (${parent.help_request.expected_artifacts.map((a: any) => a.name).join(', ')}), but no files attached.`)
  }

  return { patch, satisfies, hints }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
