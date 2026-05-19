import { describe, it, expect } from 'vitest'
import { generateMarkdown, generatePlainText, parseMarkdown } from '../markdown.js'
import type { NmpPayload } from '../types.js'

describe('generateMarkdown', () => {
  it('generates minimal nmp.md with required sections', () => {
    const payload: NmpPayload = { nmp: 1, type: 'share' }
    const md = generateMarkdown('Hello world', payload)

    expect(md).toContain('## Message')
    expect(md).toContain('- type: share')
    expect(md).toContain('## Content')
    expect(md).toContain('Hello world')
  })

  it('includes project and labels', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'question',
      project: 'backend-refactor',
      labels: ['code-review', 'urgent'],
    }
    const md = generateMarkdown('Review this', payload)

    expect(md).toContain('- project: backend-refactor')
    expect(md).toContain('- labels: code-review, urgent')
  })

  it('includes priority only when not normal', () => {
    const normal: NmpPayload = { nmp: 1, type: 'share', priority: 'normal' }
    const urgent: NmpPayload = { nmp: 1, type: 'share', priority: 'urgent' }

    expect(generateMarkdown('test', normal)).not.toContain('- priority:')
    expect(generateMarkdown('test', urgent)).toContain('- priority: urgent')
  })

  it('includes context section', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'share',
      context: {
        repo: 'github.com/acme/api',
        file: 'src/session.ts',
        lines: '20-35',
        language: 'typescript',
      },
    }
    const md = generateMarkdown('Bug here', payload)

    expect(md).toContain('## Context')
    expect(md).toContain('- repo: github.com/acme/api')
    expect(md).toContain('- file: src/session.ts')
    expect(md).toContain('- lines: 20-35')
    expect(md).toContain('- language: typescript')
  })

  it('includes capabilities section', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'question',
      capabilities: ['translate', 'file-share'],
      require: ['code-review'],
    }
    const md = generateMarkdown('Review please', payload)

    expect(md).toContain('## Capabilities')
    expect(md).toContain('- has: translate, file-share')
    expect(md).toContain('- require: code-review')
  })

  it('includes attachments section', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'share',
      files: ['session.ts', 'config.json'],
    }
    const md = generateMarkdown('See attached', payload)

    expect(md).toContain('## Attachments')
    expect(md).toContain('- session.ts')
    expect(md).toContain('- config.json')
  })

  it('includes reply schema section from JSON Schema', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'question',
      reply_schema: {
        type: 'object',
        properties: {
          approved: { type: 'boolean', description: 'Approve merge' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['approved'],
      },
    }
    const md = generateMarkdown('Review PR', payload)

    expect(md).toContain('## Reply Schema')
    expect(md).toContain('- approved: boolean (Approve merge) [必填]')
    expect(md).toContain('- risk_level: low | medium | high')
    expect(md).not.toContain('risk_level: low | medium | high [必填]')  // risk_level is not required
  })

  it('omits optional sections when empty', () => {
    const payload: NmpPayload = { nmp: 1, type: 'notify' }
    const md = generateMarkdown('Deploy done', payload)

    expect(md).not.toContain('## Context')
    expect(md).not.toContain('## Capabilities')
    expect(md).not.toContain('## Attachments')
    expect(md).not.toContain('## Reply Schema')
  })

  it('includes expires when set', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'question',
      expires: '2026-05-15T00:00:00Z',
    }
    const md = generateMarkdown('Quick question', payload)

    expect(md).toContain('- expires: 2026-05-15T00:00:00Z')
  })
})

describe('generatePlainText', () => {
  it('generates plain text with just content', () => {
    const payload: NmpPayload = { nmp: 1, type: 'share' }
    const text = generatePlainText('Hello world', payload)

    expect(text).toContain('Hello world')
    expect(text).not.toContain('---')
  })

  it('adds metadata after separator', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'share',
      project: 'my-project',
      context: { file: 'src/main.ts', lines: '10-20', repo: 'github.com/me/repo' },
    }
    const text = generatePlainText('Check this', payload)

    expect(text).toContain('Check this')
    expect(text).toContain('---')
    expect(text).toContain('文件: src/main.ts')
    expect(text).toContain('行号: 10-20')
    expect(text).toContain('仓库: github.com/me/repo')
    expect(text).toContain('项目: my-project')
  })
})

describe('parseMarkdown', () => {
  it('parses minimal nmp.md', () => {
    const md = `## Message

- type: share

## Content

Hello world
`
    const parsed = parseMarkdown(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.type).toBe('share')
    expect(parsed!.content).toBe('Hello world')
  })

  it('parses full nmp.md', () => {
    const md = `## Message

- type: question
- project: backend-refactor
- labels: code-review, urgent
- priority: urgent
- expires: 2026-05-15T00:00:00Z

## Content

Please review this code change.

The backoff logic needs attention.

## Context

- repo: github.com/acme/api
- file: src/session.ts
- lines: 20-35
- language: typescript

## Capabilities

- has: translate, file-share
- require: code-review

## Attachments

- session.ts (1.2 KB)
- config.json (0.5 KB)

## Reply Schema

- approved: boolean (Approve merge) [必填]
- risk_level: low | medium | high
`
    const parsed = parseMarkdown(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.type).toBe('question')
    expect(parsed!.project).toBe('backend-refactor')
    expect(parsed!.labels).toEqual(['code-review', 'urgent'])
    expect(parsed!.priority).toBe('urgent')
    expect(parsed!.expires).toBe('2026-05-15T00:00:00Z')
    expect(parsed!.content).toContain('Please review this code change.')
    expect(parsed!.content).toContain('The backoff logic needs attention.')
    expect(parsed!.context?.repo).toBe('github.com/acme/api')
    expect(parsed!.context?.file).toBe('src/session.ts')
    expect(parsed!.context?.lines).toBe('20-35')
    expect(parsed!.context?.language).toBe('typescript')
    expect(parsed!.capabilities).toEqual(['translate', 'file-share'])
    expect(parsed!.require).toEqual(['code-review'])
    expect(parsed!.attachments).toEqual(['session.ts (1.2 KB)', 'config.json (0.5 KB)'])
    expect(parsed!.replySchema).toHaveLength(2)
  })

  it('returns null for invalid markdown (missing Message)', () => {
    const md = `## Content

Hello
`
    expect(parseMarkdown(md)).toBeNull()
  })

  it('returns null for invalid markdown (missing Content)', () => {
    const md = `## Message

- type: share
`
    expect(parseMarkdown(md)).toBeNull()
  })

  it('roundtrips: generate → parse', () => {
    const payload: NmpPayload = {
      nmp: 1,
      type: 'question',
      project: 'infra',
      labels: ['devops'],
      context: { file: 'deploy.yml', language: 'yaml' },
      require: ['debug'],
      files: ['error.log'],
    }
    const content = 'What is wrong with this deploy config?'

    const md = generateMarkdown(content, payload)
    const parsed = parseMarkdown(md)

    expect(parsed).not.toBeNull()
    expect(parsed!.type).toBe('question')
    expect(parsed!.project).toBe('infra')
    expect(parsed!.labels).toEqual(['devops'])
    expect(parsed!.content).toBe(content)
    expect(parsed!.context?.file).toBe('deploy.yml')
    expect(parsed!.context?.language).toBe('yaml')
    expect(parsed!.require).toEqual(['debug'])
    expect(parsed!.attachments).toEqual(['error.log'])
  })
})
