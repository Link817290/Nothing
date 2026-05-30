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

/** Validate an Execution Capsule */
export function validateExecutionCapsule(capsule: unknown): ValidationResult {
  const errors: string[] = []

  if (!capsule || typeof capsule !== 'object') {
    return { valid: false, errors: ['Capsule is not an object'], level: NMP_COMPLIANCE.NONE }
  }

  const c = capsule as Record<string, unknown>

  if (!c.id || typeof c.id !== 'string') errors.push('Missing or invalid capsule id')
  if (!c.name || typeof c.name !== 'string') errors.push('Missing or invalid capsule name')
  if (!c.version || typeof c.version !== 'string') errors.push('Missing or invalid capsule version')

  // Activation
  if (!c.activation || typeof c.activation !== 'object') {
    errors.push('Missing activation')
  } else {
    const act = c.activation as Record<string, unknown>
    if (!Array.isArray(act.task_types) || act.task_types.length === 0) {
      errors.push('activation.task_types must be a non-empty array')
    }
  }

  // State machine
  if (!c.state_machine || typeof c.state_machine !== 'object') {
    errors.push('Missing state_machine')
  } else {
    const sm = c.state_machine as Record<string, unknown>
    if (!sm.initial || typeof sm.initial !== 'string') errors.push('state_machine.initial required')
    if (!Array.isArray(sm.final) || sm.final.length === 0) errors.push('state_machine.final must be non-empty array')
    if (!sm.states || typeof sm.states !== 'object') {
      errors.push('state_machine.states required')
    } else {
      const states = sm.states as Record<string, unknown>
      if (typeof sm.initial === 'string' && !states[sm.initial]) {
        errors.push(`state_machine.initial "${sm.initial}" not found in states`)
      }
      for (const [name, state] of Object.entries(states)) {
        if (!state || typeof state !== 'object') {
          errors.push(`State "${name}" is not an object`)
          continue
        }
        const s = state as Record<string, unknown>
        if (!s.goal || typeof s.goal !== 'string') errors.push(`State "${name}" missing goal`)
        if (!Array.isArray(s.transitions)) errors.push(`State "${name}" missing transitions array`)
      }
    }
  }

  // Tool policy
  if (!c.tool_policy || typeof c.tool_policy !== 'object') {
    errors.push('Missing tool_policy')
  } else {
    const tp = c.tool_policy as Record<string, unknown>
    if (!Array.isArray(tp.allow)) errors.push('tool_policy.allow must be an array')
  }

  // Validators
  if (!Array.isArray(c.validators)) {
    errors.push('validators must be an array')
  }

  return {
    valid: errors.length === 0,
    errors,
    level: errors.length === 0 ? NMP_COMPLIANCE.FULL : NMP_COMPLIANCE.NONE,
  }
}

/** Validate a Help Request */
export function validateHelpRequest(req: unknown): ValidationResult {
  const errors: string[] = []

  if (!req || typeof req !== 'object') {
    return { valid: false, errors: ['Help request is not an object'], level: NMP_COMPLIANCE.NONE }
  }

  const r = req as Record<string, unknown>
  if (!r.id || typeof r.id !== 'string') errors.push('Missing or invalid help request id')
  if (!r.goal || typeof r.goal !== 'string') errors.push('Missing or invalid goal')

  if (r.expected_artifacts && !Array.isArray(r.expected_artifacts)) {
    errors.push('expected_artifacts must be an array')
  }
  if (r.constraints && !Array.isArray(r.constraints)) {
    errors.push('constraints must be an array')
  }

  return {
    valid: errors.length === 0,
    errors,
    level: errors.length === 0 ? NMP_COMPLIANCE.BASIC : NMP_COMPLIANCE.NONE,
  }
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
