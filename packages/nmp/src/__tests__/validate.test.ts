import { describe, it, expect } from 'vitest'
import { validatePayload, validateMarkdown } from '../validate.js'

describe('validatePayload', () => {
  it('validates a minimal valid payload', () => {
    const result = validatePayload({ nmp: 1, type: 'share' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.level).toBe(1)
  })

  it('validates a Level 2 payload with capabilities', () => {
    const result = validatePayload({
      nmp: 1,
      type: 'question',
      capabilities: ['code-review'],
      require: ['sql-optimize'],
    })
    expect(result.valid).toBe(true)
    expect(result.level).toBe(2)
  })

  it('rejects non-object', () => {
    const result = validatePayload('not an object')
    expect(result.valid).toBe(false)
    expect(result.level).toBe(0)
  })

  it('rejects wrong nmp version', () => {
    const result = validatePayload({ nmp: 99, type: 'share' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('version')
  })

  it('rejects invalid type', () => {
    const result = validatePayload({ nmp: 1, type: 'invalid' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('type')
  })

  it('rejects invalid priority', () => {
    const result = validatePayload({ nmp: 1, type: 'share', priority: 'super-urgent' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('priority')
  })

  it('rejects invalid expires', () => {
    const result = validatePayload({ nmp: 1, type: 'share', expires: 'not-a-date' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('expires')
  })

  it('rejects non-array labels', () => {
    const result = validatePayload({ nmp: 1, type: 'share', labels: 'not-array' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('labels')
  })
})

describe('validateMarkdown', () => {
  it('validates correct nmp.md', () => {
    const md = `## Message\n\n- type: share\n\n## Content\n\nHello\n`
    const result = validateMarkdown(md)
    expect(result.valid).toBe(true)
    expect(result.level).toBe(1)
  })

  it('detects Level 2 with capabilities', () => {
    const md = `## Message\n\n- type: share\n\n## Content\n\nHello\n\n## Capabilities\n\n- has: code-review\n`
    const result = validateMarkdown(md)
    expect(result.valid).toBe(true)
    expect(result.level).toBe(2)
  })

  it('rejects missing Message section', () => {
    const md = `## Content\n\nHello\n`
    const result = validateMarkdown(md)
    expect(result.valid).toBe(false)
  })

  it('rejects missing Content section', () => {
    const md = `## Message\n\n- type: share\n`
    const result = validateMarkdown(md)
    expect(result.valid).toBe(false)
  })
})
