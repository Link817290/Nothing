/** NMP protocol version */
export const NMP_VERSION = 1

// ─── Constants (single source of truth) ─────────────────────────────

/** Message types */
export const NMP_TYPES = ['share', 'question', 'reply', 'notify'] as const
export type NmpType = typeof NMP_TYPES[number]

/** Priority levels */
export const NMP_PRIORITIES = ['urgent', 'normal', 'low'] as const
export type NmpPriority = typeof NMP_PRIORITIES[number]

/** Message statuses */
export const NMP_STATUSES = ['queued', 'sent', 'delivered', 'read', 'replied', 'failed'] as const
export type NmpStatus = typeof NMP_STATUSES[number]

/** Message sources */
export const NMP_SOURCES = ['nmp', 'external'] as const
export type NmpSource = typeof NMP_SOURCES[number]

/** Channel backend types */
export const NMP_CHANNEL_TYPES = ['nothing', 'smtp', 'stalwart', 'local'] as const
export type NmpChannelType = typeof NMP_CHANNEL_TYPES[number]

/** Token permissions */
export const TOKEN_PERMISSIONS = ['send', 'inbox', 'read', 'reply', 'manage'] as const
export type TokenPermission = typeof TOKEN_PERMISSIONS[number]

/** Error codes */
export const NMP_ERROR_CODES = [
  'capability_not_supported',
  'schema_mismatch',
  'rate_limited',
  'rejected',
  'expired',
  'version_unsupported',
  'payload_too_large',
] as const
export type NmpErrorCode = typeof NMP_ERROR_CODES[number]

/** Compliance levels */
export const NMP_COMPLIANCE = {
  NONE: 0,
  BASIC: 1,
  FULL: 2,
} as const
export type NmpComplianceLevel = typeof NMP_COMPLIANCE[keyof typeof NMP_COMPLIANCE]

// ─── Defaults ───────────────────────────────────────────────────────

export const NMP_DEFAULTS = {
  subjectMaxLength: 50,
  messageLimit: 20,
  dailyMessageLimit: 50,
  tokenRateLimit: 10,
  priority: 'normal' as NmpPriority,
  type: 'share' as NmpType,
} as const

// ─── Limits ─────────────────────────────────────────────────────────

export const NMP_LIMITS = {
  maxEmailSize: 10 * 1024 * 1024,
  maxAttachments: 5,
  maxJsonSize: 256 * 1024,
  maxMarkdownSize: 64 * 1024,
  maxPlainTextSize: 64 * 1024,
} as const

// ─── Header names ───────────────────────────────────────────────────

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
} as const

/** Reserved attachment filename for NMP markdown */
export const NMP_ATTACHMENT_NAME = 'nmp.md'

// ─── Interfaces ─────────────────────────────────────────────────────

/** Channel configuration */
export interface NmpChannelConfig {
  id: string
  name: string
  type: NmpChannelType
  email: string
  smtp_host?: string
  smtp_port?: number
  imap_host?: string
  imap_port?: number
  is_primary: boolean
  is_active: boolean
}

/** Code context attached to a message */
export interface NmpContext {
  repo?: string
  file?: string
  lines?: string
  language?: string
}

/** Error returned in reply messages */
export interface NmpError {
  code: NmpErrorCode
  message: string
  supported?: string[]
}

/** NMP JSON payload (Part 3) — metadata only, no message body */
export interface NmpPayload {
  nmp: number
  type: NmpType
  agent?: string
  project?: string
  labels?: string[]
  priority?: NmpPriority
  expires?: string
  ack?: boolean
  context?: NmpContext
  files?: string[]
  capabilities?: string[]
  require?: string[]
  reply_schema?: Record<string, unknown>
  source?: NmpSource
  error?: NmpError
}

/** Parsed nmp.md content (Part 2) */
export interface NmpMarkdown {
  type: NmpType
  agent?: string
  project?: string
  labels?: string[]
  priority?: NmpPriority
  expires?: string
  content: string
  context?: NmpContext
  capabilities?: string[]
  require?: string[]
  attachments?: string[]
  replySchema?: string[]
}

/** Full NMP message (combined from all parts) */
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

/** Attachment metadata */
export interface NmpAttachment {
  filename: string
  size: number
  contentType: string
}
