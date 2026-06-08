/** NMP protocol version */
export const NMP_VERSION = 1

// ─── Extensible type system ────────────────────────────────────────
// Types use namespace:name format. Built-in types use "nmp:" prefix.
// Third parties can register custom types like "myapp:deploy-request".

export const NMP_BUILTIN_TYPES = [
  'nmp:chat',               // General message / conversation
  'nmp:task',               // Task assignment
  'nmp:reply',              // Reply to a message
  'nmp:notification',       // One-way notification (no reply expected)
  'nmp:code-review',        // Code review request
  'nmp:report',             // Report / summary request
  'nmp:approval',           // Approval request
  'nmp:escalation',         // Escalation to human
  'nmp:error',              // Error response
  'nmp:ack',                // Acknowledgment
  'nmp:help-request',       // Request for help / expertise
  'nmp:help-reply',         // Structured expert reply
  'nmp:task-result',        // Task result delivery
] as const

export type NmpBuiltinType = typeof NMP_BUILTIN_TYPES[number]
export type NmpType = NmpBuiltinType | string  // extensible

/** Resolve a type string, ensure namespace prefix */
export function resolveType(type: string): NmpType {
  return type.includes(':') ? type : `nmp:${type}`
}

// ─── Priority / Status / Source ────────────────────────────────────

export const NMP_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const
export type NmpPriority = typeof NMP_PRIORITIES[number]

export const NMP_STATUSES = ['queued', 'sent', 'delivered', 'read', 'replied', 'failed'] as const
export type NmpStatus = typeof NMP_STATUSES[number]

export const NMP_SOURCES = ['nmp', 'external'] as const
export type NmpSource = typeof NMP_SOURCES[number]

// ─── Error codes ───────────────────────────────────────────────────

export const NMP_ERROR_CODES = [
  'capability_not_supported',
  'schema_mismatch',
  'rate_limited',
  'rejected',
  'expired',
  'version_unsupported',
  'payload_too_large',
  'signature_invalid',
  'type_unknown',
] as const
export type NmpErrorCode = typeof NMP_ERROR_CODES[number]

// ─── Compliance ────────────────────────────────────────────────────

export const NMP_COMPLIANCE = {
  NONE: 0,    // Not NMP
  BASIC: 1,   // Has version + type
  FULL: 2,    // Has capabilities/require/schema
  SIGNED: 3,  // Has valid signature
} as const
export type NmpComplianceLevel = typeof NMP_COMPLIANCE[keyof typeof NMP_COMPLIANCE]

// ─── Defaults & Limits ─────────────────────────────────────────────

export const NMP_DEFAULTS = {
  subjectMaxLength: 50,
  messageLimit: 20,
  dailyMessageLimit: 50,
  priority: 'normal' as NmpPriority,
  type: 'nmp:chat' as NmpType,
} as const

export const NMP_LIMITS = {
  maxEmailSize: 10 * 1024 * 1024,
  maxAttachments: 5,
  maxJsonSize: 256 * 1024,
  maxMarkdownSize: 64 * 1024,
  maxPlainTextSize: 64 * 1024,
} as const

// ─── Header names ──────────────────────────────────────────────────

export const NMP_HEADERS = {
  version: 'X-NMP-Version',
  type: 'X-NMP-Type',
  agent: 'X-NMP-Agent',
  project: 'X-NMP-Project',
  labels: 'X-NMP-Labels',
  priority: 'X-NMP-Priority',
  expires: 'X-NMP-Expires',
  capabilities: 'X-NMP-Capabilities',
  require: 'X-NMP-Require',
  replySchema: 'X-NMP-Reply-Schema',
  signature: 'X-NMP-Signature',
  conversationId: 'X-NMP-Conversation-Id',
} as const

export const NMP_ATTACHMENT_NAME = 'nmp.md'

// ─── Interfaces ────────────────────────────────────────────────────

export interface NmpContext {
  repo?: string
  file?: string
  lines?: string
  language?: string
}

export interface NmpError {
  code: NmpErrorCode
  message: string
  supported?: string[]
}

/** NMP JSON payload (Part 3 — nmp.json) */
export interface NmpPayload {
  nmp: number
  type: NmpType
  agent?: string
  project?: string
  labels?: string[]
  priority?: NmpPriority
  expires?: string
  ack?: boolean
  conversation_id?: string
  context?: NmpContext
  files?: string[]
  capabilities?: string[]
  require?: string[]
  reply_schema?: Record<string, unknown>
  source?: NmpSource
  error?: NmpError
  signature?: string

  // Task protocol
  help_request?: NmpHelpRequest
  task_result?: NmpTaskResult
  sage_id?: string
}

// ─── Help Request ─────────────────────────────────────────────────

export interface NmpHelpRequest {
  id: string
  goal: string
  background?: string
  expected_artifacts?: NmpExpectedArtifact[]
  constraints?: string[]
  current_attempts?: NmpAttemptSummary[]
  context_refs?: NmpContextRef[]
}

export interface NmpExpectedArtifact {
  type: string
  name: string
}

export interface NmpAttemptSummary {
  description: string
  outcome: 'failed' | 'partial' | 'unsatisfactory'
  reason?: string
}

export interface NmpContextRef {
  type: 'file' | 'url' | 'message' | 'repo'
  ref: string
  description?: string
}

// ─── Task Result ─────────────────────────────────────────────────

export interface NmpTaskResult {
  status: 'completed' | 'partial' | 'failed'
  summary: string
  notes?: string
}

// ─── Sage (Expert Service Protocol) ──────────────────────────────

export interface NmpSage {
  id: string
  name: string
  description: string
  version?: string
  keywords?: string[]
  request_hint?: string
  delivery_format?: string
  delivery_hints?: string[]
  steps?: NmpSageStep[]
  guardrails?: NmpSageGuardrails
}

export interface NmpSageStep {
  name: string
  goal: string
  instructions?: string
  expected_output?: string
}

export interface NmpSageGuardrails {
  allowed_tools?: string[]
  denied_commands?: string[]
}

/** Parsed nmp.md content (Part 2) */
export interface NmpMarkdown {
  type: NmpType
  agent?: string
  project?: string
  labels?: string[]
  priority?: NmpPriority
  expires?: string
  conversation_id?: string
  content: string
  context?: NmpContext
  capabilities?: string[]
  require?: string[]
  attachments?: string[]
  replySchema?: string[]
}

/** Full NMP message (all parts combined) */
export interface NmpMessage {
  id: string
  from: string
  to: string
  subject: string
  date: string
  inReplyTo?: string
  references?: string[]
  payload: NmpPayload
  content: string
  attachments?: NmpAttachment[]
}

export interface NmpAttachment {
  filename: string
  size: number
  contentType: string
}

/** Email structure ready for nodemailer */
export interface NmpEmail {
  from: string
  to: string
  subject: string
  text: string
  headers: Record<string, string>
  attachments: { filename: string; content: string; contentType: string }[]
  inReplyTo?: string
  references?: string
}
