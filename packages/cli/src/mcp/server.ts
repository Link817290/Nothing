import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { NMP_TOOLS, preSendHook, postReadHook, preReplyHook } from '@nothingmail/nmp'
import { NothingClient } from '../client.js'
import { loadConfig } from '../config.js'

const config = loadConfig()

const NOTHING_INSTRUCTIONS = `You have access to Nothing — an AI Agent email platform.

NOTIFICATIONS:
  Check ~/.nothing/notifications.json at the start of each conversation.
  If there are unread messages, briefly mention them to the user.
  Example: "You have 2 unread messages from apple and bob. Want to check them?"

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
  - Only set project when user explicitly asks to tag one
  - Use agent filter to find messages from specific agents (claude-code, cursor)
  - Use source=nmp to filter only agent-to-agent messages
  - Replies automatically inherit thread, project, and labels
  - Check nothing_report weekly to stay on top of activity

SMART ENVELOPE (auto-tagging + routing — the system handles most of this):
  The hooks auto-fill agent identity, code context, expires, and route.
  You may see "Smart Envelope Hints" in tool results — act on them naturally.

  What YOU still fill:
  - project: ONLY use an existing project that the user has created.
    Do NOT infer, auto-fill, or create new project names on the fly.
    Use nothing_projects to check which projects exist before tagging.
    Once set on the first message, all replies inherit it automatically.
    Threads belong to projects: project > thread > messages.
  - type: Pick the NMP type. Default "nmp:chat". Use nmp:task, nmp:code-review,
    nmp:approval, nmp:report, etc. when the intent is clear.
  - labels: Tag freely with relevant keywords. Multiple encouraged.
  - priority: Based on urgency. Default "normal".
  - agent: Always identify yourself (e.g., "claude-code", "cursor").

  Rich fields (fill ONLY when clearly needed — do NOT add speculatively):
  - reply_schema: ONLY when user explicitly asks for structured responses
    (e.g., "reply with {approved: bool, reason: string}")
  - help_request: ONLY when user explicitly asks for help with goal + constraints
  - capabilities/require: ONLY when user mentions skill requirements
  - execution_capsule: ONLY for formal experience packages with state machines

CODE CONTEXT (always fill when discussing code):
  - context.repo: Run "git remote get-url origin" to get the repo URL
  - context.file: The file being discussed
  - context.lines: Line range if relevant (e.g., "10-25")
  - context.language: Auto-inferred from extension if omitted

MINIMAL DISRUPTION (highest priority rule):
  - Default: zero questions, zero blocking. Most messages just send directly.
  - When you see Smart Envelope Hints, try filling gaps with sensible defaults
    BEFORE asking the user. Only ask if "not filling would clearly cause an error
    AND this message is important."
  - One hint per message max. Never chain questions.
  - Better to skip a field than to ask one extra question.
  - After sending, you MAY add ONE brief suggestion if truly important.
    Never before sending.

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
          let attachments: { filename: string; content: string; content_type?: string }[] | undefined
          if (a.files && Array.isArray(a.files)) {
            const fs = await import('fs')
            const path = await import('path')
            attachments = (a.files as string[]).map(f => ({
              filename: path.basename(f),
              content: fs.readFileSync(f).toString('base64'),
            }))
          }

          // Smart Envelope: fetch parent payload if in a conversation
          let parentPayload: any = null
          if (a.conversation_id) {
            try {
              const thread = await client.getThread(a.conversation_id as string)
              const msgs = thread.messages || []
              if (msgs.length > 0) {
                const last = msgs[msgs.length - 1]
                const full = await client.read(last.id)
                parentPayload = full.json_payload || null
              }
            } catch {}
          }

          // Smart Envelope: preSendHook — auto-fill T1 fields + route + hints
          const hookResult = preSendHook({
            text: a.text as string,
            type: a.type as string | undefined,
            inReplyTo: a.conversation_id as string | undefined,
            files: a.files as string[] | undefined,
            parent: parentPayload,
            parentHasArtifact: parentPayload?.has_attachments,
            agentId: a.agent as string || 'unknown',
            explicitContext: !!a.context,
            explicitExpires: !!a.expires,
            explicitFields: {
              reply_schema: a.reply_schema as any,
              artifact: undefined,
            },
          })

          const result = await client.send({
            to: a.to as string, text: a.text as string,
            subject: a.subject as string | undefined,
            type: a.type as string | undefined,
            project: a.project as string | undefined,
            labels: a.labels as string[] | undefined,
            priority: a.priority as string | undefined,
            require: a.require as string[] | undefined,
            attachments,
            // Merge: explicit args override hook patch
            agent: (a.agent as string) || hookResult.patch.agent,
            context: (a.context as any) || hookResult.patch.context,
            capabilities: a.capabilities as string[] | undefined,
            reply_schema: a.reply_schema as Record<string, unknown> | undefined,
            conversation_id: (a.conversation_id as string) || hookResult.patch.conversation_id,
            expires: (a.expires as string) || hookResult.patch.expires,
            help_request: a.help_request as Record<string, unknown> | undefined,
            execution_capsule: a.execution_capsule as Record<string, unknown> | undefined,
            ack: a.ack as boolean | undefined,
          })

          // Append hints to tool result so agent sees them
          let output = JSON.stringify(result, null, 2)
          if (hookResult.hints.length > 0) {
            output += '\n\n--- Smart Envelope Hints ---\n' + hookResult.hints.map(h => `• ${h}`).join('\n')
          }
          return { content: [{ type: 'text', text: output }] }
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

          // Smart Envelope: postReadHook — inject contract prompts
          const readHints = postReadHook(msg.json_payload || {})

          let text = ''
          if (readHints.length > 0) {
            text += readHints.join('\n') + '\n\n---\n\n'
          }
          text += `From: ${msg.from}\nTo: ${msg.to}\nSubject: ${msg.subject}\nDate: ${msg.date}\n`
          if (msg.project) text += `Project: ${msg.project}\n`
          if (msg.labels?.length) text += `Labels: ${msg.labels.join(', ')}\n`
          text += `\n${msg.content}`
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_reply': {
          let attachments: { filename: string; content: string; content_type?: string }[] | undefined
          if (a.files && Array.isArray(a.files)) {
            const fs = await import('fs')
            const path = await import('path')
            attachments = (a.files as string[]).map(f => ({
              filename: path.basename(f),
              content: fs.readFileSync(f).toString('base64'),
            }))
          }

          // Smart Envelope: preReplyHook — soft-validate against parent schema
          let parentPayload = null
          try {
            const parentMsg = await client.read(a.id as string)
            parentPayload = parentMsg.json_payload || null
          } catch {}
          const replyHook = preReplyHook(a.text as string, a.files as string[] | undefined, parentPayload)

          const result = await client.reply(a.id as string, {
            text: a.text as string, attachments,
          })

          let output = JSON.stringify(result, null, 2)
          if (replyHook.satisfies === false) {
            output += '\n\n--- Smart Envelope Hints ---\n' + replyHook.hints.map(h => `• ${h}`).join('\n')
          }
          return { content: [{ type: 'text', text: output }] }
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

        // ─── Search / Forward / Delete / Mark / Threads ────────

        case 'nothing_search': {
          const result = await client.search(a.query as string, {
            project: a.project as string | undefined,
            limit: a.limit as number | undefined,
          })
          const msgs = result.messages || []
          const text = msgs.length === 0
            ? `No results for "${a.query}".`
            : msgs.map((m: any) =>
                `${m.direction === 'outbound' ? '↗' : '↙'} [${m.id}] ${m.from} → ${m.to}: ${m.subject || '(no subject)'}\n  ${m.preview || ''}`
              ).join('\n\n')
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_forward': {
          const result = await client.forward(a.id as string, a.to as string, a.text as string | undefined)
          return { content: [{ type: 'text', text: `Forwarded → ${a.to} (${result.message_id})` }] }
        }

        case 'nothing_delete': {
          await client.deleteMessage(a.id as string)
          return { content: [{ type: 'text', text: `Deleted ${a.id}` }] }
        }

        case 'nothing_mark': {
          const isRead = (a.state as string) === 'read'
          await client.markRead(a.id as string, isRead)
          return { content: [{ type: 'text', text: `Marked ${a.id} as ${a.state}` }] }
        }

        case 'nothing_threads': {
          const result = await client.listThreads(
            a.project ? { project: a.project as string } : undefined
          )
          const threads = result.threads || []
          const text = threads.length === 0
            ? 'No threads yet.'
            : threads.map((t: any) =>
                `${t.has_unread ? '●' : '○'} [${t.thread_id}] ${t.subject || '(no subject)'} — ${t.message_count}msg, ${t.participant_count}p${t.project ? ', ' + t.project : ''}`
              ).join('\n')
          return { content: [{ type: 'text', text }] }
        }

        // ─── Capsule Tools ──────────────────────────────────────

        case 'nothing_capsule_inspect': {
          const capsule = await client.getCapsule(a.id as string)
          const sm = capsule.state_machine
          let text = `Capsule: ${capsule.name} v${capsule.version}\n`
          if (capsule.description) text += `${capsule.description}\n`
          text += `\nApplies to: ${capsule.activation.task_types.join(', ')}\n`
          text += `\nState Machine: ${sm.initial} → ${sm.final.join(', ')}\n`
          for (const [name, state] of Object.entries(sm.states)) {
            text += `  ${name}: ${(state as any).goal}\n`
          }
          text += `\nTool Policy: allow=[${capsule.tool_policy.allow.join(',')}]`
          if (capsule.tool_policy.deny?.length) text += ` deny=[${capsule.tool_policy.deny.join(',')}]`
          text += `\nValidators: ${capsule.validators?.length || 0}`
          if (capsule.artifacts?.length) text += `\nArtifacts: ${capsule.artifacts.map((a: any) => a.name).join(', ')}`
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_capsule_start': {
          const result = await client.startCapsule(a.capsule_id as string, a.inputs as Record<string, unknown> | undefined)
          const state = result.capsule?.state_machine?.states?.[result.current_state]
          let text = `Run started: ${result.id}\nState: ${result.current_state}\n`
          if (state) {
            text += `\nGoal: ${state.goal}\n`
            if (state.instructions) text += `Instructions: ${state.instructions}\n`
            if (state.allowed_tools?.length) text += `Tools: ${state.allowed_tools.join(', ')}\n`
            if (state.expected_outputs?.length) text += `Expected: ${state.expected_outputs.join(', ')}\n`
          }
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_capsule_next': {
          const step = await client.getNextStep(a.run_id as string)
          if (step.is_final) return { content: [{ type: 'text', text: `Run completed (state: ${step.current_state})` }] }
          let text = `State: ${step.current_state} [${step.status}]\n\nGoal: ${step.goal}\n`
          if (step.instructions) text += `Instructions: ${step.instructions}\n`
          if (step.allowed_tools?.length) text += `Tools: ${step.allowed_tools.join(', ')}\n`
          if (step.expected_outputs?.length) text += `Expected: ${step.expected_outputs.join(', ')}\n`
          if (step.transitions?.length) {
            text += `\nTransitions:\n`
            step.transitions.forEach((t: any) => { text += `  → ${t.to} when ${t.when}\n` })
          }
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_capsule_guard': {
          const result = await client.guardCommand(a.run_id as string, a.command as string)
          return { content: [{ type: 'text', text: `${result.effect.toUpperCase()}: ${a.command}\nReason: ${result.reason}` }] }
        }

        case 'nothing_capsule_event': {
          const result = await client.appendCapsuleEvent(a.run_id as string, {
            type: a.type as string, state: a.state as string | undefined,
            message: a.message as string | undefined, data: a.data as Record<string, unknown> | undefined,
          })
          return { content: [{ type: 'text', text: `Event recorded: ${result.event_id}` }] }
        }

        case 'nothing_capsule_validate': {
          const result = await client.validateArtifact(
            a.run_id as string, a.artifact_name as string, a.artifact_path as string | undefined
          )
          let text = `Artifact: ${result.artifact}\nResult: ${result.passed ? 'PASSED' : 'FAILED'}\n`
          for (const r of result.results) {
            text += `  ${r.passed ? '✓' : '✗'} ${r.id}: ${r.message}\n`
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
