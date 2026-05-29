import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { NMP_TOOLS } from '@nothingmail/nmp'
import { NothingClient } from '../client.js'
import { loadConfig } from '../config.js'

const config = loadConfig()

const NOTHING_INSTRUCTIONS = `You have access to Nothing — an AI Agent email platform.

SETUP (if not configured):
  If the user hasn't set up Nothing yet, guide them:
  1. Install: npm i -g nothing-cli
  2. Connect: nothing init (choose login or register)
  3. Done — MCP tools are auto-installed

AVAILABLE TOOLS:
  nothing_send     — Send email/NMP message. Trigger: "send to", "email", "notify"
  nothing_inbox    — Check inbox. Trigger: "check mail", "any messages", "inbox"
  nothing_read     — Read full message. Trigger: "open that message", "read it"
  nothing_reply    — Reply to message. Trigger: "reply", "respond", "answer"
  nothing_sent     — Check sent status. Trigger: "did they reply", "delivery status"
  nothing_projects — List projects. Trigger: "project overview", "what projects"
  nothing_report   — Activity report. Trigger: "weekly summary", "report"

BEST PRACTICES:
  - Set project when sending work-related messages
  - Use agent filter to find messages from specific agents (claude-code, cursor)
  - Use source=nmp to filter only agent-to-agent messages
  - Replies automatically inherit thread, project, and labels
  - Check nothing_report weekly to stay on top of activity

SMART TAGGING (infer from context, be natural):
  - project: Use whatever project/product/client the user is working on. Infer from
    git repo, conversation context, or the topic being discussed. Free-form string.
  - type: Pick the NMP type that best fits the intent. Use "nmp:" prefix for built-in
    types (chat, task, code-review, report, notification, approval, escalation, error, ack)
    or create custom types like "myapp:deploy-request". Default to "nmp:chat".
  - labels: Tag freely with any relevant keywords. No fixed list — use whatever
    describes the message best. Multiple labels encouraged.
  - priority: Set based on urgency cues in the conversation. Default "normal".
  - agent: Always identify yourself (e.g., "claude-code", "cursor").

  The goal is to make messages searchable and filterable later. Tag generously
  but accurately. When in doubt, add a label rather than skip it.

CURRENT USER: ${config.email || 'not configured'}
SERVER: ${config.server_url || 'not configured'}
`

export async function startMcpServer() {
  if (!config.initialized || !config.server_url || !config.token) {
    console.error('Not initialized. Run "nothing init" first.')
    process.exit(1)
  }

  const client = new NothingClient({ serverUrl: config.server_url, token: config.token })

  const server = new Server(
    { name: 'nothing', version: '0.2.0' },
    { capabilities: { tools: {}, prompts: {} } },
  )

  // Prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [{ name: 'nothing-guide', description: 'How to use Nothing email tools effectively' }],
  }))

  server.setRequestHandler(GetPromptRequestSchema, async () => ({
    description: 'Nothing usage guide',
    messages: [{ role: 'user', content: { type: 'text', text: NOTHING_INSTRUCTIONS } }],
  }))

  // Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(NMP_TOOLS),
  }))

  // Tool handlers
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const a = (args || {}) as Record<string, unknown>

    try {
      switch (name) {
        case 'nothing_send': {
          const result = await client.send({
            to: a.to as string, text: a.text as string,
            subject: a.subject as string | undefined,
            type: a.type as string | undefined,
            project: a.project as string | undefined,
            labels: a.labels as string[] | undefined,
            files: a.files as string[] | undefined,
            require: a.require as string[] | undefined,
            priority: a.priority as string | undefined,
          })
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }

        case 'nothing_inbox': {
          const result = await client.inbox({
            unread: a.unread, project: a.project, label: a.label,
            channel: a.channel, source: a.source, agent: a.agent, limit: a.limit,
          })
          const text = result.messages.length === 0
            ? 'No unread messages.'
            : result.messages.map((m: any) =>
                `${m.unread ? '●' : '○'} [${m.id}] ${m.from}: ${m.subject}\n  ${m.preview}`
              ).join('\n\n') + `\n\nTotal unread: ${result.total_unread}`
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_sent': {
          const result = await client.sent({ project: a.project, limit: a.limit })
          const text = result.messages.length === 0
            ? 'No sent messages.'
            : result.messages.map((m: any) =>
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
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_reply': {
          const result = await client.reply(a.id as string, {
            text: a.text as string, files: a.files as string[] | undefined,
          })
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }

        case 'nothing_projects': {
          const result = await client.projects()
          const text = result.projects.length === 0
            ? 'No projects yet.'
            : result.projects.map((p: any) => `${p.name}: ${p.total} messages, ${p.unread} unread`).join('\n')
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_report': {
          const result = await client.report({ period: a.period as string, project: a.project as string })
          let text = `Report — ${result.period.label}\n\n`
          text += `Sent: ${result.summary.sent}  Received: ${result.summary.received}  Replied: ${result.summary.replied}  Failed: ${result.summary.failed}\n`
          if (result.projects.length > 0) {
            text += '\nProjects:\n'
            result.projects.forEach((p: any) => { text += `  ${p.name}: ${p.messages} msgs\n` })
          }
          if (result.needs_reply.length > 0) {
            text += '\nNeeds reply:\n'
            result.needs_reply.forEach((m: any) => { text += `  ${m.from}: ${m.subject}\n` })
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
