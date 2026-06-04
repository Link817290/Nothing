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
  'nmp:execution-capsule',  // Deliver executable experience package
  'nmp:capsule-run',        // Declare a capsule execution started
  'nmp:capsule-event',      // Record execution process event
  'nmp:artifact-created',   // Record artifact creation
  'nmp:help-reply',         // Structured expert reply
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

  // Execution Capsule extensions (optional, backward-compatible)
  help_request?: NmpHelpRequest
  execution_capsule?: NmpExecutionCapsule
  capsule_run?: NmpCapsuleRun
  capsule_event?: NmpCapsuleEvent
  artifact?: NmpArtifact
  experience_pack?: NmpExperiencePack
}

// ─── Help Request ─────────────────────────────────────────────────

export interface NmpHelpRequest {
  id: string
  goal: string
  background?: string
  expected_artifacts?: NmpExpectedArtifact[]
  constraints?: string[]
  current_attempts?: NmpAttemptSummary[]
  preferred_reply_types?: Array<'help-reply' | 'execution-capsule' | 'patch' | 'checklist'>
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

// ─── Execution Capsule ────────────────────────────────────────────

export interface NmpExecutionCapsule {
  id: string
  name: string
  version: string
  description?: string
  author?: NmpCapsuleAuthor
  license?: string
  activation: NmpCapsuleActivation
  inputs?: NmpCapsuleInput[]
  state_machine: NmpCapsuleStateMachine
  tool_policy: NmpCapsuleToolPolicy
  file_policy?: NmpCapsuleFilePolicy
  network_policy?: NmpCapsuleNetworkPolicy
  budget_policy?: NmpCapsuleBudgetPolicy
  validators: NmpCapsuleValidator[]
  fallbacks?: Record<string, NmpCapsuleFallback>
  artifacts?: NmpCapsuleArtifactSpec[]
  attachment_refs?: string[]
  examples?: NmpCapsuleExample[]
}

export interface NmpCapsuleAuthor {
  name: string
  email?: string
  agent?: string
}

export interface NmpCapsuleActivation {
  task_types?: string[]
  keywords?: string[]
  required_context?: string[]
  unsupported_context?: string[]
  confidence?: number
}

export interface NmpCapsuleInput {
  name: string
  type: 'string' | 'number' | 'boolean' | 'file' | 'json'
  required: boolean
  description?: string
  default?: unknown
}

// ─── State Machine ────────────────────────────────────────────────

export interface NmpCapsuleStateMachine {
  initial: string
  final: string[]
  states: Record<string, NmpCapsuleState>
}

export interface NmpCapsuleState {
  title?: string
  goal: string
  instructions?: string
  required_inputs?: string[]
  expected_outputs?: string[]
  allowed_tools?: string[]
  validators?: string[]
  transitions: NmpCapsuleTransition[]
}

export interface NmpCapsuleTransition {
  to: string
  when: string
  fallback?: string
}

// ─── Policies ─────────────────────────────────────────────────────

export interface NmpCapsuleToolPolicy {
  allow: string[]
  deny?: string[]
  require_confirm?: string[]
  command_rules?: NmpCommandRule[]
}

export interface NmpCommandRule {
  pattern: string
  effect: 'allow' | 'deny' | 'confirm'
  reason: string
}

export interface NmpCapsuleFilePolicy {
  read_allow?: string[]
  read_deny?: string[]
  write_allow?: string[]
  write_deny?: string[]
}

export interface NmpCapsuleNetworkPolicy {
  allow_hosts?: string[]
  deny_hosts?: string[]
  require_confirm?: string[]
}

export interface NmpCapsuleBudgetPolicy {
  max_steps?: number
  max_tool_calls?: number
  max_retries?: number
  timeout_minutes?: number
}

// ─── Validators & Fallbacks ───────────────────────────────────────

export interface NmpCapsuleValidator {
  id: string
  type: 'file_exists' | 'json_schema' | 'command' | 'llm_check' | 'manual'
  target?: string
  rule: string
  severity: 'error' | 'warning'
}

export interface NmpCapsuleFallback {
  description: string
  action: string
}

export interface NmpCapsuleArtifactSpec {
  name: string
  type: string
  required: boolean
  validators?: string[]
}

export interface NmpCapsuleExample {
  input: Record<string, unknown>
  description: string
}

// ─── Capsule Run & Events ─────────────────────────────────────────

export interface NmpCapsuleRun {
  id: string
  capsule_id: string
  capsule_version: string
  help_request_id?: string
  status: 'created' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled'
  current_state: string
  started_at: string
  completed_at?: string
  executor?: string
}

export interface NmpCapsuleEvent {
  id: string
  run_id: string
  type: 'state_entered' | 'state_completed' | 'tool_requested' | 'tool_allowed' | 'tool_denied' | 'validator_passed' | 'validator_failed' | 'artifact_created' | 'blocked' | 'note'
  state?: string
  message?: string
  data?: Record<string, unknown>
  created_at: string
}

// ─── Artifact ─────────────────────────────────────────────────────

export interface NmpArtifact {
  id: string
  run_id?: string
  name: string
  type: string
  mime_type?: string
  attachment_id?: string
  sha256?: string
  size?: number
  created_at: string
  provenance?: NmpArtifactProvenance
}

export interface NmpArtifactProvenance {
  source_message_id?: string
  capsule_id?: string
  run_id?: string
  state?: string
  validators?: string[]
}

// ─── Experience Pack ─────────────────────────────────────────────

export interface NmpExperiencePackActivation {
  keywords?: string[]
  task_types?: string[]
}

export interface NmpExperiencePackSource {
  message_id?: string
  author?: string
}

export interface NmpExperiencePack {
  id: string
  name: string
  kind: 'execution_capsule'
  installable?: boolean
  runnable?: boolean
  activation?: NmpExperiencePackActivation
  source?: NmpExperiencePackSource
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
