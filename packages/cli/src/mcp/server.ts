import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { NMP_TOOLS } from '@nothing/nmp'
import { NothingClient } from '../client.js'
import { loadConfig } from '../config.js'

const NOTHING_INSTRUCTIONS = `You have access to Nothing — an AI Agent email system. Use it to:

WHEN TO USE:
- User says "send to", "email", "notify", "tell X" → use nothing_send
- User says "check mail", "any messages", "inbox" → use nothing_inbox
- User says "read that message", "open", "show" → use nothing_read
- User says "reply", "respond", "answer" → use nothing_reply
- User asks about projects, status, overview → use nothing_projects
- User asks for summary, report, weekly update → use nothing_report
- User asks "did they reply", "delivery status" → use nothing_sent

BEST PRACTICES:
- Always set project when sending work-related messages
- Use --from to filter messages from specific agents or people
- Use --channel to filter by email provider (gmail, qq, nothing)
- When replying, the thread context is inherited automatically
- For code discussions, include file paths and line numbers in the message body
- Check nothing_report weekly to stay on top of activity

CURRENT USER: ${loadConfig().email || 'local'}
PROVIDER: ${loadConfig().provider || 'local'}
`

export async function startMcpServer() {
  const config = loadConfig()
  const client = new NothingClient({
    token: config.token || '',
    api_host: config.api_host,
  })

  const server = new Server(
    { name: 'nothing', version: '0.1.0' },
    { capabilities: { tools: {}, prompts: {} } },
  )

  // Prompts — system instructions for the Agent
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [{
      name: 'nothing-guide',
      description: 'How to use Nothing email tools effectively',
    }],
  }))

  server.setRequestHandler(GetPromptRequestSchema, async () => ({
    description: 'Nothing usage guide',
    messages: [{
      role: 'user',
      content: { type: 'text', text: NOTHING_INSTRUCTIONS },
    }],
  }))

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(NMP_TOOLS),
  }))

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const a = (args || {}) as Record<string, unknown>

    try {
      switch (name) {
        case 'nothing_send': {
          const result = await client.send({
            to: a.to as string,
            text: a.text as string,
            subject: a.subject as string | undefined,
            type: a.type as any,
            project: a.project as string | undefined,
            labels: a.labels as string[] | undefined,
            files: a.files as string[] | undefined,
            require: a.require as string[] | undefined,
            priority: a.priority as any,
          })
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }

        case 'nothing_inbox': {
          const result = await client.inbox({
            unread: a.unread as boolean | undefined,
            project: a.project as string | undefined,
            label: a.label as string | undefined,
            limit: a.limit as number | undefined,
          })
          const text = result.messages.length === 0
            ? 'No unread messages.'
            : result.messages.map(m =>
                `${m.unread ? '●' : '○'} [${m.id}] ${m.from}: ${m.subject}\n  ${m.preview}`
              ).join('\n\n') + `\n\nTotal unread: ${result.total_unread}`
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_sent': {
          const result = await client.sent({
            project: a.project as string | undefined,
            limit: a.limit as number | undefined,
          })
          const text = result.messages.length === 0
            ? 'No sent messages.'
            : result.messages.map(m =>
                `[${m.status}] [${m.id}] To: ${m.to}: ${m.subject}\n  ${m.preview}`
              ).join('\n\n')
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_read': {
          const msg = await client.read(a.id as string)
          let text = `From: ${msg.from}\nTo: ${msg.to}\nSubject: ${msg.subject}\nDate: ${msg.date}\n`
          if (msg.project) text += `Project: ${msg.project}\n`
          if (msg.labels?.length) text += `Labels: ${msg.labels.join(', ')}\n`
          text += `\n${msg.content}`
          if (msg.context) {
            text += '\n\n--- Context ---'
            if (msg.context.repo) text += `\nRepo: ${msg.context.repo}`
            if (msg.context.file) text += `\nFile: ${msg.context.file}`
            if (msg.context.lines) text += `\nLines: ${msg.context.lines}`
          }
          if (msg.attachments?.length) {
            text += '\n\n--- Attachments ---'
            msg.attachments.forEach(att => { text += `\n${att.filename} (${att.size} bytes)` })
          }
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_reply': {
          const result = await client.reply(a.id as string, {
            text: a.text as string,
            files: a.files as string[] | undefined,
          })
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }

        case 'nothing_projects': {
          const result = await client.projects()
          const text = result.projects.length === 0
            ? 'No projects yet.'
            : result.projects.map(p =>
                `${p.name}: ${p.total} messages, ${p.unread} unread`
              ).join('\n')
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_report': {
          const result = await client.report({
            period: a.period as any,
            project: a.project as string | undefined,
          })
          let text = `📊 Report — ${result.period.label}\n\n`
          text += `Sent: ${result.summary.sent}  Received: ${result.summary.received}  Replied: ${result.summary.replied}  Failed: ${result.summary.failed}\n`

          if (result.projects.length > 0) {
            text += '\nProjects:\n'
            result.projects.forEach(p => {
              text += `  ${p.name}: ${p.messages} msgs, ${p.threads} threads, ${p.resolved} resolved\n`
            })
          }

          if (result.needs_reply.length > 0) {
            text += '\nNeeds your reply:\n'
            result.needs_reply.forEach(m => {
              text += `  ● ${m.from}: ${m.subject}\n`
            })
          }

          if (result.top_threads.length > 0) {
            text += '\nTop threads:\n'
            result.top_threads.forEach(t => {
              const icon = t.status === 'replied' ? '✓' : '○'
              text += `  ${icon} ${t.subject} (${t.message_count} msgs)\n`
            })
          }

          return { content: [{ type: 'text', text }] }
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
