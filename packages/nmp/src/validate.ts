import { NMP_VERSION, NMP_PRIORITIES, NMP_LIMITS, NMP_COMPLIANCE } from './types.js'
import type { NmpComplianceLevel } from './types.js'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  level: NmpComplianceLevel
}

/** Validate an NMP JSON payload */
export function validatePayload(payload: unknown): ValidationResult {
  const errors: string[] = []

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload is not an object'], level: NMP_COMPLIANCE.NONE }
  }

  const p = payload as Record<string, unknown>

  // MUST: nmp version
  if (p['nmp'] !== NMP_VERSION) {
    errors.push(`Invalid nmp version: ${p['nmp']}, expected ${NMP_VERSION}`)
  }

  // MUST: type (string, should contain ':' for namespaced types)
  if (!p['type'] || typeof p['type'] !== 'string') {
    errors.push(`Invalid type: ${p['type']}, expected a string`)
  }

  // SHOULD: priority
  if (p['priority'] && !(NMP_PRIORITIES as readonly string[]).includes(p['priority'] as string)) {
    errors.push(`Invalid priority: ${p['priority']}, expected one of ${NMP_PRIORITIES.join(', ')}`)
  }

  // MAY: expires (must be valid ISO 8601)
  if (p['expires'] && isNaN(Date.parse(p['expires'] as string))) {
    errors.push(`Invalid expires: ${p['expires']}, expected ISO 8601 date`)
  }

  // MAY: labels (must be string array)
  if (p['labels'] && !Array.isArray(p['labels'])) {
    errors.push('labels must be a string array')
  }

  // MAY: agent (must be string)
  if (p['agent'] && typeof p['agent'] !== 'string') {
    errors.push('agent must be a string')
  }

  // MAY: conversation_id (must be string)
  if (p['conversation_id'] && typeof p['conversation_id'] !== 'string') {
    errors.push('conversation_id must be a string')
  }

  // Determine compliance level
  let level: NmpComplianceLevel = NMP_COMPLIANCE.NONE
  if (errors.length === 0) {
    level = NMP_COMPLIANCE.BASIC
    if (p['capabilities'] || p['require'] || p['reply_schema']) {
      level = NMP_COMPLIANCE.FULL
    }
    if (p['signature']) {
      level = NMP_COMPLIANCE.SIGNED
    }
  }

  return { valid: errors.length === 0, errors, level }
}

/** Validate nmp.md content string */
export function validateMarkdown(md: string): ValidationResult {
  const errors: string[] = []

  if (md.length > NMP_LIMITS.maxMarkdownSize) {
    errors.push(`Markdown exceeds ${NMP_LIMITS.maxMarkdownSize} bytes limit`)
  }

  if (!md.includes('## Message')) {
    errors.push('Missing required ## Message section')
  }

  if (!md.includes('## Content')) {
    errors.push('Missing required ## Content section')
  }

  const level: NmpComplianceLevel = errors.length === 0
    ? (md.includes('## Capabilities') || md.includes('## Reply Schema') ? NMP_COMPLIANCE.FULL : NMP_COMPLIANCE.BASIC)
    : NMP_COMPLIANCE.NONE

  return { valid: errors.length === 0, errors, level }
}
