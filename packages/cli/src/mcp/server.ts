import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { NMP_TOOLS, preSendHook, postReadHook, preReplyHook } from '@nothingmail/nmp'
import { NothingClient } from '../client.js'
import { loadConfig, loadPreferences } from '../config.js'

const config = loadConfig()
const prefs = loadPreferences()

/** Detect which agent/editor launched this MCP server */
function detectAgent(): string {
  const env = process.env
  // Claude Code sets CLAUDE_CODE
  if (env.CLAUDE_CODE || env.CLAUDE_CONTEXT) return 'claude-code'
  // Cursor sets CURSOR_*
  if (env.CURSOR_TRACE_ID || env.CURSOR_SESSION) return 'cursor'
  // Codex sets CODEX_*
  if (env.CODEX_SESSION || env.CODEX_SANDBOX) return 'codex'
  // Windsurf / Codeium
  if (env.WINDSURF_SESSION || env.CODEIUM_API_KEY) return 'windsurf'
  // OpenCode
  if (env.OPENCODE_SESSION || env.OPENCODE) return 'opencode'
  // VS Code generic (Copilot etc)
  if (env.VSCODE_PID || env.VSCODE_IPC_HOOK) return 'vscode'
  // Check parent process name as fallback
  try {
    const ppid = process.ppid
    if (ppid) {
      const { execSync } = require('child_process')
      const parentName = execSync(
        process.platform === 'win32'
          ? `wmic process where processid=${ppid} get name /value 2>nul`
          : `ps -p ${ppid} -o comm= 2>/dev/null`,
        { encoding: 'utf-8', timeout: 2000 }
      ).toLowerCase()
      if (parentName.includes('claude')) return 'claude-code'
      if (parentName.includes('cursor')) return 'cursor'
      if (parentName.includes('codex')) return 'codex'
      if (parentName.includes('windsurf')) return 'windsurf'
      if (parentName.includes('opencode')) return 'opencode'
      if (parentName.includes('code')) return 'vscode'
    }
  } catch {}
  return 'unknown'
}

const detectedAgent = detectAgent()

const NOTHING_INSTRUCTIONS = `You have access to Nothing — an AI Agent email platform.

IMPORTANT — ALWAYS DO THIS FIRST:
  At the START of every conversation, IMMEDIATELY check ~/.nothing/notifications.json.
  If there are unread messages, tell the user RIGHT AWAY before doing anything else.
  Example: "You have 2 unread messages from apple and bob. Want to check them?"
  This is your highest priority action when a conversation begins.

  When the user mentions anything related to email, messages, sending, inbox,
  contacts, or communication — you have Nothing tools available. Use them.
  Don't wait for the user to explicitly say "use Nothing".

SETUP (if not configured):
  If the user hasn't set up Nothing yet, guide them:
  1. Install: npm i -g nothing-cli
  2. Connect: nothing init -s https://nothingmail.shop -k <API_KEY>
     (user gets API key from web dashboard Settings page)
  3. Done — MCP tools are auto-installed
  Note: Do NOT run "nothing init" without flags — it's interactive and won't work here.

CLI NON-INTERACTIVE RULES:
  All CLI commands that ask for confirmation have --yes (-y) to skip.
  Always use -y when running: nothing delete, nothing reset, nothing project:delete,
  nothing sage publish, nothing sage create --public.
  NEVER run interactive commands without flags — they will hang.

AVAILABLE TOOLS:
  nothing_send     — Send email/NMP message. Trigger: "send to", "email", "notify"
  nothing_inbox    — Check inbox. Trigger: "check mail", "any messages", "inbox"
  nothing_read     — Read full message. Trigger: "open that message", "read it"
  nothing_reply    — Reply to message. Trigger: "reply", "respond", "answer"
  nothing_sent     — Check sent status. Trigger: "did they reply", "delivery status"
  nothing_projects — List projects. Trigger: "project overview", "what projects"
  nothing_report   — Activity report. Trigger: "weekly summary", "report"
  nothing_sages  — Browse expert services (Sage). Trigger: "who can help", "show sages", "智者"
  nothing_sage_search — Search sages by keyword. Trigger: task keywords

BEST PRACTICES:
  - Only set project when user explicitly asks to tag one
  - Use agent filter to find messages from specific agents (claude-code, cursor)
  - Use source=nmp to filter only agent-to-agent messages
  - Replies automatically inherit thread, project, and labels
  - Check nothing_report weekly to stay on top of activity
  - THREAD CONTINUITY: When following up on a task (revisions, format changes,
    additional requests), ALWAYS use nothing_reply to the original message.
    Do NOT send a new message with nothing_send. Keep it in the same thread.
    New thread = new topic. Same topic = reply in existing thread.

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
  - help_request: ONLY when user explicitly asks for help with goal + constraints
  - capabilities/require: ONLY when user mentions skill requirements

CODE CONTEXT (always fill when discussing code):
  - context.repo: Run "git remote get-url origin" to get the repo URL
  - context.file: The file being discussed
  - context.lines: Line range if relevant (e.g., "10-25")
  - context.language: Auto-inferred from extension if omitted

SAGE (智者 — expert service protocols):

  Sages are experts with specific capabilities. Each sage has an email
  address — they're real people (or their agents) who can help.

  When a user needs help or is unsatisfied with results:
    1. Search: nothing_sage_search with relevant keyword
    2. Found? Tell user: "有个专家能帮你做这个，要找他帮忙吗？"
    3. User confirms → nothing_send to the sage's expert email:
       - type: nmp:task
       - to: the expert's email (from search result)
       - sage_id: the sage ID (so expert's agent knows the protocol)
       - text: describe what you need in natural language
    4. Expert reads message → sage protocol is auto-injected → works accordingly
    5. Expert replies in the same thread → you receive the result

  This is just email — happens in a normal thread, not a separate system.

  Browse: nothing_sages
  Search: nothing_sage_search

  Example:
    1. nothing_sage_search("数据清洗")
       → 数据清洗 [sage_xxx] Expert: link@nothingmail.shop
    2. nothing_send(to: "link@nothingmail.shop", type: "nmp:task",
       sage_id: "sage_xxx", text: "帮我清洗附件里的CSV")
    3. Expert replies in thread with result

  CLI shortcut: nothing sage use <id> "description" [-f file1 file2]

TASK PROTOCOL (when you receive an nmp:task or nmp:help-request):
  1. Read the message — postReadHook will show:
     - What's requested (goal, constraints, expected deliverables)
     - If sage_id is set: the full Sage protocol (delivery format, quality criteria)
  2. Do the work using your normal tools (Read, Bash, Grep, etc.)
  3. Reply with nothing_reply:
     - Text: brief summary of what was done
     - Files: attach the actual deliverables (CSV, markdown, code, etc.)
     - Use -f flag: nothing_reply with files parameter for attachments
     - The type is auto-set to nmp:task-result
  4. If you can't complete the task, reply explaining why

  IMPORTANT:
  - For data/file deliverables, always attach as files.
    Write to file first, then attach. Body = brief summary only.
  - Sage protocol defines the BASE requirements (format, quality).
    The requester's message text may contain extra requirements (tip).
    You must satisfy BOTH the protocol AND the tip.
    Example: protocol says "deliver markdown report",
    tip says "重点关注安全性" — deliver markdown report focused on security.

CHECKING FOR NEW MESSAGES:
  At conversation start, check for unread messages:
    1. First try: read ~/.nothing/notifications.json (fast, local)
    2. If file missing or stale: use nothing_inbox to check directly
  Tell the user immediately if there are unread messages.

MINIMAL DISRUPTION (highest priority rule):
  - Default: zero questions, zero blocking. Most messages just send directly.
  - When you see Smart Envelope Hints, try filling gaps with sensible defaults
    BEFORE asking the user. Only ask if "not filling would clearly cause an error
    AND this message is important."
  - One hint per message max. Never chain questions.
  - Better to skip a field than to ask one extra question.
  - After sending, you MAY add ONE brief suggestion if truly important.
    Never before sending.

USER PREFERENCES (from ~/.nothing/preferences.json — respect these):
${prefs.reply_style ? `  Reply style: ${prefs.reply_style} — match this tone in all outgoing messages.` : ''}
${prefs.reply_language ? `  Reply language: ${prefs.reply_language} — write messages in this language unless user specifies otherwise.` : ''}
${prefs.signature ? `  Signature: "${prefs.signature}" — append this to every outgoing message.` : ''}
${!prefs.reply_style && !prefs.reply_language && !prefs.signature ? '  (no preferences set)' : ''}

MEMORY (from ~/.nothing/memory.json — learn and recall):
  You have a memory file at ~/.nothing/memory.json. Use it to:
  - Remember user preferences mentioned in conversation (e.g., "I prefer short replies")
  - Remember frequent contacts and how user refers to them (e.g., "bob = bob@company.com")
  - Remember project context that persists across sessions
  To save: read the file, add/update entries, write back.
  To recall: read the file at conversation start.
  Keep entries concise. Max 50 entries. Oldest get pruned.

CURRENT USER: ${config.email || 'not configured'}
SERVER: ${config.server_url || 'not configured'}
AGENT: ${detectedAgent} (auto-detected — always use this as your agent identity)
`

export async function startMcpServer() {
  if (!config.initialized || !config.server_url || !config.token) {
    console.error('Not initialized. Run "nothing init" first.')
    process.exit(1)
  }

  // Auto-inject global instructions if missing (covers upgrades)
  try {
    const { injectGlobalInstruction } = await import('../commands/mcp-install.js')
    injectGlobalInstruction()
  } catch {}

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

  // Tools — inject unread notification into tool list so agent sees it immediately
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Object.values(NMP_TOOLS).map(t => ({ ...t }))

    // Read notifications and prepend to nothing_inbox description
    try {
      const { readNotifications } = await import('../config.js')
      const notif = readNotifications()
      if (notif.unread > 0) {
        const inbox = tools.find((t: any) => t.name === 'nothing_inbox') as any
        if (inbox) {
          const preview = notif.messages.slice(0, 3).map((m: any) =>
            `${m.from?.split('@')[0]}: ${m.subject || '(no subject)'}`
          ).join('; ')
          inbox.description = `[📬 ${notif.unread} unread: ${preview}] ` + inbox.description
        }
      }
    } catch {}

    return { tools }
  })

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
            agentId: a.agent as string || detectedAgent,
            explicitContext: !!a.context,
            explicitExpires: !!a.expires,
            explicitFields: {
              reply_schema: a.reply_schema as any,
              task_result: undefined,
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
            agent: (a.agent as string) || hookResult.patch.agent || detectedAgent,
            context: (a.context as any) || hookResult.patch.context,
            capabilities: a.capabilities as string[] | undefined,
            reply_schema: a.reply_schema as Record<string, unknown> | undefined,
            conversation_id: (a.conversation_id as string) || hookResult.patch.conversation_id,
            expires: (a.expires as string) || hookResult.patch.expires,
            help_request: a.help_request as Record<string, unknown> | undefined,
            sage_id: a.sage_id as string | undefined,
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

          // Sage protocol injection: if message references a sage_id, fetch protocol (own or public)
          const sageId = msg.json_payload?.sage_id
          if (sageId) {
            try {
              // Try own sages first, then public
              let sage: any = null
              try { sage = (await client.listSages({})).sages?.find((s: any) => s.id === sageId) } catch {}
              if (!sage) { try { sage = await client.getPublicSage(sageId) } catch {} }
              if (sage) {
                const sj = typeof sage.sage_json === 'string' ? JSON.parse(sage.sage_json) : (sage.sage_json || {})
                const lines = [`🧙 Sage Protocol: ${sage.name}`]
                if (sage.description) lines.push(`   ${sage.description}`)
                if (sj.delivery_format) lines.push(`   Deliver as: ${sj.delivery_format}`)
                if (sj.delivery_hints?.length) lines.push(`   Quality criteria: ${sj.delivery_hints.join('; ')}`)
                lines.push(``)
                lines.push(`   ⚠ Two layers to satisfy:`)
                lines.push(`   1. Protocol (above): base delivery format and quality criteria`)
                lines.push(`   2. User tip (in message body): any extra requirements from the requester`)
                lines.push(`   Deliver as file attachment. Reply body = brief summary only.`)
                readHints.unshift(...lines)
              }
            } catch {}
          }

          let text = ''
          if (readHints.length > 0) {
            text += readHints.filter(Boolean).join('\n') + '\n\n---\n\n'
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
            ? 'No projects. Create one with nothing_project_create.'
            : result.projects.map((p: any) =>
                `${p.name}${p.description ? ' — ' + p.description : ''}: ${p.thread_count || 0} threads, ${p.message_count || 0} messages, ${p.unread || 0} unread`
              ).join('\n')
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_project_create': {
          const result = await client.createProject(a.name as string, a.description as string | undefined)
          return { content: [{ type: 'text', text: `Project "${result.name}" created (${result.id})` }] }
        }

        case 'nothing_project_delete': {
          await client.deleteProject(a.id as string)
          return { content: [{ type: 'text', text: `Project deleted. Messages untagged.` }] }
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

        // ─── Sage Tools ─────────────────────────────────────────

        case 'nothing_sages': {
          const result = await client.listSages({
            favorited: a.installed as boolean | undefined,
            keyword: a.keyword as string | undefined,
          })
          if (result.sages.length === 0) {
            return { content: [{ type: 'text', text: 'No sages found.' }] }
          }
          const text = result.sages.map((s: any) =>
            `${s.favorited ? '★' : '○'} ${s.name}${s.version ? ' v' + s.version : ''} [${s.id}]\n  ${s.description || '—'}\n  Keywords: ${(s.keywords || []).join(', ') || '—'}${s.author_email ? '\n  From: ' + s.author_email : ''}`
          ).join('\n\n')
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_sage_search': {
          const result = await client.searchSages(a.keyword as string)
          if (result.sages.length === 0) {
            return { content: [{ type: 'text', text: `No sages matching "${a.keyword}".` }] }
          }
          const text = result.sages.map((s: any) =>
            `${s.favorited ? '★' : '○'} ${s.name} [${s.id}]\n  ${s.description || '—'}\n  Keywords: ${(s.keywords || []).join(', ')}${s.author_email ? '\n  Expert: ' + s.author_email + ' — use nothing_send to request help' : ''}`
          ).join('\n\n')
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
