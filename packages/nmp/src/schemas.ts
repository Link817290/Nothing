import { Registry } from './registry.js'

/** Schema registry — extensible collection of Reply Schemas */
export const schemaRegistry = new Registry<Record<string, unknown>>()

// ─── Shared enum values (reusable across schemas) ───────────────────

const RISK_LEVELS = ['low', 'medium', 'high'] as const
const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const

// ─── Pre-defined schemas ────────────────────────────────────────────

schemaRegistry.register('nmp:code-review', {
  type: 'object',
  properties: {
    approved: { type: 'boolean', description: 'Approve merge' },
    risk_level: { type: 'string', enum: [...RISK_LEVELS], description: 'Risk level' },
    comments: { type: 'string', description: 'Review comments' },
    suggestions: { type: 'string', description: 'Improvement suggestions' },
  },
  required: ['approved', 'risk_level', 'comments'],
})

schemaRegistry.register('nmp:approval', {
  type: 'object',
  properties: {
    approved: { type: 'boolean', description: 'Approved' },
    reason: { type: 'string', description: 'Reason' },
  },
  required: ['approved', 'reason'],
})

schemaRegistry.register('nmp:bug-report', {
  type: 'object',
  properties: {
    severity: { type: 'string', enum: [...SEVERITY_LEVELS], description: 'Severity' },
    steps: { type: 'string', description: 'Steps to reproduce' },
    expected: { type: 'string', description: 'Expected behavior' },
    actual: { type: 'string', description: 'Actual behavior' },
  },
  required: ['severity', 'steps', 'expected', 'actual'],
})

schemaRegistry.register('nmp:translation', {
  type: 'object',
  properties: {
    translated_text: { type: 'string', description: 'Translated text' },
    source_language: { type: 'string', description: 'Source language' },
    target_language: { type: 'string', description: 'Target language' },
  },
  required: ['translated_text', 'source_language', 'target_language'],
})

// ─── Public API ─────────────────────────────────────────────────────

/** Resolve a schema reference (e.g., "nmp:code-review") */
export function resolveSchema(ref: string): Record<string, unknown> | null {
  return schemaRegistry.get(ref) ?? null
}
