import type { NmpMarkdown, NmpPayload, NmpContext, NmpType, NmpPriority } from './types.js'

/** Generate nmp.md content from payload + message body */
export function generateMarkdown(
  content: string,
  payload: NmpPayload,
): string {
  const sections: string[] = []

  // ## Message (required)
  const messageParts: string[] = []
  messageParts.push(`- type: ${payload.type}`)
  if (payload.agent) messageParts.push(`- agent: ${payload.agent}`)
  if (payload.project) messageParts.push(`- project: ${payload.project}`)
  if (payload.labels?.length) messageParts.push(`- labels: ${payload.labels.join(', ')}`)
  if (payload.priority && payload.priority !== 'normal') messageParts.push(`- priority: ${payload.priority}`)
  if (payload.expires) messageParts.push(`- expires: ${payload.expires}`)
  if (payload.conversation_id) messageParts.push(`- conversation: ${payload.conversation_id}`)
  sections.push(`## Message\n\n${messageParts.join('\n')}`)

  // ## Content (required)
  sections.push(`## Content\n\n${content}`)

  // ## Context (optional)
  if (payload.context) {
    const ctx = payload.context
    const ctxParts: string[] = []
    if (ctx.repo) ctxParts.push(`- repo: ${ctx.repo}`)
    if (ctx.file) ctxParts.push(`- file: ${ctx.file}`)
    if (ctx.lines) ctxParts.push(`- lines: ${ctx.lines}`)
    if (ctx.language) ctxParts.push(`- language: ${ctx.language}`)
    if (ctxParts.length) sections.push(`## Context\n\n${ctxParts.join('\n')}`)
  }

  // ## Capabilities (optional)
  if (payload.capabilities?.length || payload.require?.length) {
    const capParts: string[] = []
    if (payload.capabilities?.length) capParts.push(`- has: ${payload.capabilities.join(', ')}`)
    if (payload.require?.length) capParts.push(`- require: ${payload.require.join(', ')}`)
    sections.push(`## Capabilities\n\n${capParts.join('\n')}`)
  }

  // ## Attachments (optional)
  if (payload.files?.length) {
    const fileParts = payload.files.map(f => `- ${f}`)
    sections.push(`## Attachments\n\n${fileParts.join('\n')}`)
  }

  // ## Reply Schema (optional, auto-generated from JSON Schema)
  if (payload.reply_schema) {
    const schemaLines = generateSchemaMarkdown(payload.reply_schema)
    if (schemaLines.length) sections.push(`## Reply Schema\n\n${schemaLines.join('\n')}`)
  }

  // ## Help Request (optional)
  if (payload.help_request) {
    const hr = payload.help_request
    const parts: string[] = [`- goal: ${hr.goal}`]
    if (hr.background) parts.push(`- background: ${hr.background}`)
    if (hr.constraints?.length) parts.push(`- constraints: ${hr.constraints.join(', ')}`)
    if (hr.expected_artifacts?.length) {
      parts.push(`- expected: ${hr.expected_artifacts.map(a => `${a.name} (${a.type})`).join(', ')}`)
    }
    sections.push(`## Help Request\n\n${parts.join('\n')}`)
  }

  // ## Task Result (optional)
  if (payload.task_result) {
    const tr = payload.task_result
    const parts: string[] = [`- status: ${tr.status}`]
    if (tr.summary) parts.push(`- summary: ${tr.summary}`)
    if (tr.notes) parts.push(`- notes: ${tr.notes}`)
    sections.push(`## Task Result\n\n${parts.join('\n')}`)
  }

  return sections.join('\n\n') + '\n'
}

/** Generate plain text (Part 1) from content + payload */
export function generatePlainText(
  content: string,
  payload: NmpPayload,
): string {
  const parts: string[] = [content]
  const meta: string[] = []

  if (payload.context?.file) meta.push(`文件: ${payload.context.file}`)
  if (payload.context?.lines) meta.push(`行号: ${payload.context.lines}`)
  if (payload.context?.repo) meta.push(`仓库: ${payload.context.repo}`)
  if (payload.project) meta.push(`项目: ${payload.project}`)

  if (meta.length) {
    parts.push('---')
    parts.push(meta.join('\n'))
  }

  return parts.join('\n\n') + '\n'
}

/** Parse nmp.md content into structured data */
export function parseMarkdown(md: string): NmpMarkdown | null {
  const sections = parseSections(md)
  if (!sections['Message'] || !sections['Content']) return null

  const message = parseKV(sections['Message'])
  const context = sections['Context'] ? parseContextKV(sections['Context']) : undefined
  const capabilities = sections['Capabilities'] ? parseKV(sections['Capabilities']) : undefined

  return {
    type: (message['type'] as NmpType) || 'share',
    agent: message['agent'],
    project: message['project'],
    labels: message['labels']?.split(',').map(l => l.trim()),
    priority: message['priority'] as NmpMarkdown['priority'],
    expires: message['expires'],
    content: sections['Content'].trim(),
    context,
    capabilities: capabilities?.['has']?.split(',').map(c => c.trim()),
    require: capabilities?.['require']?.split(',').map(c => c.trim()),
    attachments: sections['Attachments']
      ? sections['Attachments'].split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim())
      : undefined,
    replySchema: sections['Reply Schema']
      ? sections['Reply Schema'].split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim())
      : undefined,
  }
}

/** Split markdown into named sections by ## headings */
function parseSections(md: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = md.split('\n')
  let currentSection = ''

  for (const line of lines) {
    const heading = line.match(/^## (.+)$/)
    if (heading) {
      currentSection = heading[1].trim()
      sections[currentSection] = ''
    } else if (currentSection) {
      sections[currentSection] += line + '\n'
    }
  }

  return sections
}

/** Parse "- key: value" lines into a record */
function parseKV(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^- (\w[\w\s]*?):\s*(.+)$/)
    if (match) result[match[1].trim()] = match[2].trim()
  }
  return result
}

/** Parse context section into NmpContext */
function parseContextKV(text: string): NmpContext {
  const kv = parseKV(text)
  return {
    repo: kv['repo'],
    file: kv['file'],
    lines: kv['lines'],
    language: kv['language'],
  }
}

/** Generate Markdown-KV lines from a JSON Schema object */
function generateSchemaMarkdown(schema: Record<string, unknown>): string[] {
  const props = schema['properties'] as Record<string, Record<string, unknown>> | undefined
  const required = (schema['required'] as string[]) || []
  if (!props) return []

  return Object.entries(props).map(([key, def]) => {
    const type = def['enum']
      ? (def['enum'] as string[]).join(' | ')
      : (def['type'] as string) || 'string'
    const desc = def['description'] ? ` (${def['description']})` : ''
    const req = required.includes(key) ? ' [必填]' : ''
    return `- ${key}: ${type}${desc}${req}`
  })
}
