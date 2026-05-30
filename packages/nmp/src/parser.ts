import {
  NMP_VERSION, NMP_ATTACHMENT_NAME, NMP_LIMITS, resolveType,
  type NmpPayload, type NmpMessage, type NmpAttachment, type NmpType,
} from './types.js'
import { parseMarkdown } from './markdown.js'

/** Result of parsing an email for NMP content */
export interface NmpParseResult {
  /** Whether this email is a valid NMP message */
  isNmp: boolean
  /** The parsed NMP message (null if not NMP) */
  message: NmpMessage | null
  /** Raw payload from nmp.json (null if not found) */
  payload: NmpPayload | null
  /** Detection method: 'header' | 'attachment' | 'both' | null */
  detectedBy: 'header' | 'attachment' | 'both' | null
}

/**
 * Parsed email input — abstracted from any specific parser library.
 * Both mailparser (Node) and browser-based parsers can produce this.
 */
export interface ParsedEmailInput {
  from?: string
  to?: string
  subject?: string
  date?: Date | string
  messageId?: string
  inReplyTo?: string
  references?: string[]
  headers?: Map<string, string | object> | Record<string, string>
  text?: string
  html?: string
  textAsHtml?: string
  attachments?: {
    filename?: string
    content: Buffer | Uint8Array
    contentType?: string
    size?: number
  }[]
}

/**
 * Parse a parsed email object into NMP message.
 * Works with output from mailparser's simpleParser or any compatible format.
 */
export function parseNmpEmail(parsed: ParsedEmailInput): NmpParseResult {
  const noResult: NmpParseResult = { isNmp: false, message: null, payload: null, detectedBy: null }

  // Detect NMP via headers
  const versionHeader = getHeader(parsed.headers, 'x-nmp-version')
  const hasHeader = !!versionHeader

  // Detect NMP via nmp.md attachment
  const nmpMdAttachment = parsed.attachments?.find(a => a.filename === NMP_ATTACHMENT_NAME)
  const nmpJsonAttachment = parsed.attachments?.find(a => a.filename === 'nmp.json')
  const hasAttachment = !!nmpMdAttachment

  if (!hasHeader && !hasAttachment) return noResult

  const detectedBy = hasHeader && hasAttachment ? 'both' : hasHeader ? 'header' : 'attachment'

  // Parse nmp.json payload (with size limit)
  let payload: NmpPayload | null = null
  if (nmpJsonAttachment) {
    try {
      const raw = bufferToString(nmpJsonAttachment.content)
      if (raw.length > NMP_LIMITS.maxJsonSize) {
        return { isNmp: false, detectedBy: null, message: null, payload: null }
      }
      payload = JSON.parse(raw) as NmpPayload
      // Normalize legacy types
      if (payload.type) payload.type = resolveType(payload.type)
    } catch {}
  }

  // Build payload from headers if nmp.json missing
  if (!payload) {
    payload = {
      nmp: parseInt(versionHeader || '1') || NMP_VERSION,
      type: resolveType(getHeader(parsed.headers, 'x-nmp-type') || 'nmp:chat'),
      agent: getHeader(parsed.headers, 'x-nmp-agent') || undefined,
      project: getHeader(parsed.headers, 'x-nmp-project') || undefined,
      labels: getHeader(parsed.headers, 'x-nmp-labels')?.split(',').map(s => s.trim()).filter(Boolean),
      priority: (getHeader(parsed.headers, 'x-nmp-priority') as any) || undefined,
      conversation_id: getHeader(parsed.headers, 'x-nmp-conversation-id') || undefined,
    }
  }

  // Extract agent from header if not in payload
  if (!payload.agent) {
    const agentHeader = getHeader(parsed.headers, 'x-nmp-agent')
    if (agentHeader) payload.agent = agentHeader
  }

  // Extract content: prefer nmp.md, fallback to text
  let content = ''
  if (nmpMdAttachment) {
    content = bufferToString(nmpMdAttachment.content)
  } else {
    content = parsed.text || parsed.html || parsed.textAsHtml || ''
  }

  // Filter out NMP attachments from user attachments
  const userAttachments: NmpAttachment[] = (parsed.attachments || [])
    .filter(a => a.filename !== NMP_ATTACHMENT_NAME && a.filename !== 'nmp.json')
    .map(a => ({
      filename: a.filename || 'unknown',
      size: a.size || a.content.length,
      contentType: a.contentType || 'application/octet-stream',
    }))

  const message: NmpMessage = {
    id: parsed.messageId || '',
    from: parsed.from || 'unknown',
    to: parsed.to || 'unknown',
    subject: parsed.subject || '(no subject)',
    date: parsed.date instanceof Date ? parsed.date.toISOString() : (parsed.date || new Date().toISOString()),
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    payload,
    content,
    attachments: userAttachments.length > 0 ? userAttachments : undefined,
  }

  return { isNmp: true, message, payload, detectedBy }
}

/**
 * Quick detection — checks if an email is NMP without full parsing.
 * Faster than parseNmpEmail when you only need to filter.
 */
export function detectNmp(parsed: ParsedEmailInput): boolean {
  if (getHeader(parsed.headers, 'x-nmp-version')) return true
  if (parsed.attachments?.some(a => a.filename === NMP_ATTACHMENT_NAME)) return true
  return false
}

// ─── Helpers ───────────────────────────────────────────────────────

function getHeader(
  headers: Map<string, string | object> | Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined
  if (headers instanceof Map) {
    const val = headers.get(name)
    return typeof val === 'string' ? val : val ? String(val) : undefined
  }
  return (headers as Record<string, string>)[name]
}

function bufferToString(buf: Buffer | Uint8Array): string {
  if (Buffer.isBuffer(buf)) return buf.toString('utf-8')
  return new TextDecoder().decode(buf)
}
