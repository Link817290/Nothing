import { describe, it, expect } from 'vitest'
import { resolveSchema, schemaRegistry } from '../schemas.js'

describe('resolveSchema', () => {
  it('resolves nmp:code-review', () => {
    const schema = resolveSchema('nmp:code-review')
    expect(schema).not.toBeNull()
    expect(schema!['type']).toBe('object')
    expect(schema!['properties']).toHaveProperty('approved')
    expect(schema!['properties']).toHaveProperty('risk_level')
    expect(schema!['properties']).toHaveProperty('comments')
  })

  it('resolves nmp:approval', () => {
    const schema = resolveSchema('nmp:approval')
    expect(schema).not.toBeNull()
    expect(schema!['properties']).toHaveProperty('approved')
    expect(schema!['properties']).toHaveProperty('reason')
  })

  it('resolves nmp:bug-report', () => {
    const schema = resolveSchema('nmp:bug-report')
    expect(schema).not.toBeNull()
    expect(schema!['required']).toEqual(['severity', 'steps', 'expected', 'actual'])
  })

  it('returns null for unknown schema', () => {
    expect(resolveSchema('nmp:unknown')).toBeNull()
    expect(resolveSchema('custom:something')).toBeNull()
  })

  it('has all pre-defined schemas', () => {
    expect(schemaRegistry.keys().sort()).toEqual([
      'nmp:approval',
      'nmp:bug-report',
      'nmp:code-review',
      'nmp:translation',
    ])
  })

  it('supports custom schema registration', () => {
    schemaRegistry.register('acme:deploy-review', {
      type: 'object',
      properties: {
        env: { type: 'string', enum: ['staging', 'production'] },
        approved: { type: 'boolean' },
      },
      required: ['env', 'approved'],
    })

    const schema = resolveSchema('acme:deploy-review')
    expect(schema).not.toBeNull()
    expect(schema!['properties']).toHaveProperty('env')

    // Cleanup
    schemaRegistry.unregister('acme:deploy-review')
  })
})
