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
  nothing_experience_packs — Browse experience packs. Trigger: "show packs", "what capsules", "经验包"
  nothing_experience_pack_search — Search packs by keyword. Trigger: "写作", "deploy", task keywords

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

EXPERIENCE PACKS (经验包):

  Installed experience packs are pre-built workflows users can run.
  When a user describes a task, search installed packs by keyword
  (nothing_experience_pack_search). If a match is found and installed,
  offer to run it. If confirmed, start via nothing_capsule_start and
  enter STRICT EXECUTION MODE.

  Browse: nothing_experience_packs
  Search: nothing_experience_pack_search
  Create & send to others: nothing_send with execution_capsule

  Example flow:
    User: "帮我写一封交付延期说明"
    → nothing_experience_pack_search("写作")
    → found installed pack "工作写作模式"
    → "你有「工作写作模式」经验包，要用它来写吗？"
    → user confirms
    → nothing_capsule_start(capsule_id) → STRICT EXECUTION MODE

EXPERIENCE CAPSULES (经验包 — execution format):

  A capsule = state machine + tool boundary + validators.
  Sender builds it, receiver executes it via MCP tools.

  ── STRUCTURE ──

  {
    "id": "cap_<random>",
    "name": "...",
    "version": "1.0",
    "description": "...",
    "state_machine": {
      "initial": "<first_state>",
      "final": ["<end_state>"],
      "states": {
        "<state_name>": {
          "goal": "what to achieve in this state",
          "instructions": "how to do it",
          "expected_outputs": ["what success looks like"],
          "allowed_tools": ["tools available in this state"],
          "transitions": [{ "to": "<next_state>", "when": "condition" }]
        }
      }
    },
    "tool_policy": {
      "allow": ["tools the executor may use"],
      "deny": ["operations that are forbidden"]
    },
    "validators": [
      { "id": "v1", "type": "file_exists|file_type|schema|custom", "config": { ... } }
    ],
    "artifacts": [
      { "name": "...", "type": "file", "mime_type": "..." }
    ]
  }

  ── RULES ──

  - Design states based on the actual task. 2-4 states is typical.
  - tool_policy.deny is the BOUNDARY — forbidden operations are enforced.
  - Each state can have its own allowed_tools (narrower than global policy).
  - Validators define how to check outputs — the executor calls validate after work.

  ── EXECUTION FLOW (receiver side, via MCP tools) ──

    nothing_capsule_inspect → understand the capsule
    nothing_capsule_start   → begin, get initial state
    nothing_capsule_next    → get current state goal + instructions
    nothing_capsule_guard   → check EVERY command before running (boundary!)
    nothing_capsule_event   → log state transitions / tool calls
    nothing_capsule_validate → verify outputs meet requirements

    Flow: inspect → start → loop { next → guard → work → event → validate } → done
    Guard is mandatory — if denied, the executor must NOT proceed.

  ── SENDING ──

  Use nothing_send with type "nmp:execution-capsule" and execution_capsule field.
  Ask user only: "what should be done" and "who to send to". Infer the rest.

EXECUTING EXPERIENCE CAPSULES (when you RECEIVE an nmp:execution-capsule message):
  When you read a message with type "nmp:execution-capsule", execute it step by step.

  ── STEP 1: INSPECT ──
  Call nothing_capsule_inspect with the capsule id.
  Read: state machine, tool policy, validators, artifacts.
  Understand what is expected before doing anything.

  ── STEP 2: START ──
  Call nothing_capsule_start with the capsule_id.
  You get: run_id, current_state, goal, instructions, allowed_tools.
  Save the run_id — you need it for all subsequent calls.

  ── STEP 3: WORK LOOP ──
  Repeat until you reach a final state:

    a) Call nothing_capsule_next with run_id.
       Read the current state's goal, instructions, expected_outputs.

    b) Before EVERY command or tool call:
       Call nothing_capsule_guard with run_id + the command string.
       - "allow" → proceed
       - "deny" → DO NOT execute. Log event and skip or find alternative.
       - "confirm" → ask the user before proceeding

    c) Do the actual work (read files, write files, search, etc.)
       Only use tools listed in the state's allowed_tools.

    d) Call nothing_capsule_event to log what you did:
       { type: "tool_call", state: "<current>", message: "what happened" }

    e) When the state's expected_outputs are met, log a transition event:
       { type: "state_transition", state: "<current>", data: { to: "<next>" } }
       Then call nothing_capsule_next again to move forward.

  ── STEP 4: VALIDATE ──
  Before finishing, call nothing_capsule_validate for each artifact.
  If validation fails, go back and fix the output.

  ── STEP 5: COMPLETE ──
  When you reach a final state, reply to the sender with the results.
  Use nothing_reply with a summary of what was done + artifact references.

  ── STRICT EXECUTION MODE ──
  When a capsule run is active, you enter STRICT EXECUTION MODE:

  1. TOOL LOCKDOWN: You may ONLY use tools listed in the current state's
     allowed_tools. ALL other tools are FORBIDDEN. Do not call any tool
     (Read, Write, Bash, Grep, etc.) unless it appears in allowed_tools
     or is a nothing_capsule_* tool.

  2. MANDATORY GUARD: Before EVERY shell command or tool call, you MUST
     call nothing_capsule_guard. If it returns "deny", you MUST NOT
     execute that command. No exceptions. No workarounds.

  3. STATE MACHINE ONLY: Follow the state machine transitions exactly.
     Do not skip states. Do not invent new states. Do not do work
     outside the current state's goal.

  4. NO SIDE EFFECTS: Do not install packages, modify files, or run
     commands that are not directly required by the current state's goal
     and instructions.

  5. LOG EVERYTHING: Every tool call, state transition, and validation
     must be recorded via nothing_capsule_event.

  6. VALIDATE BEFORE DONE: Call nothing_capsule_validate for each artifact
     before transitioning to a final state. If validation fails, fix and
     re-validate.

  7. IF STUCK: Reply to sender asking for help. Do NOT guess or bypass
     the state machine.

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
            agent: (a.agent as string) || hookResult.patch.agent || detectedAgent,
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
            execution_capsule: a.execution_capsule as any,
            experience_pack: a.experience_pack as any,
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

        // ─── Capsule Tools ──────────────────────────────────────

        case 'nothing_capsule_inspect': {
          const capsule = await client.getCapsule(a.id as string)
          const sm = capsule.state_machine
          let text = `Capsule: ${capsule.name} v${capsule.version}\n`
          if (capsule.description) text += `${capsule.description}\n`
          text += `\nApplies to: ${capsule.activation?.task_types?.join(', ') || 'general'}\n`
          text += `\nState Machine: ${sm?.initial || '?'} → ${sm?.final?.join(', ') || '?'}\n`
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
          const deny = result.capsule?.tool_policy?.deny || []
          let text = `⚠ STRICT EXECUTION MODE ACTIVE\nRun: ${result.id}\nState: ${result.current_state}\n`
          if (state) {
            text += `\nGoal: ${state.goal}\n`
            if (state.instructions) text += `Instructions: ${state.instructions}\n`
            if (state.allowed_tools?.length) text += `ALLOWED tools (use ONLY these): ${state.allowed_tools.join(', ')}\n`
            if (state.expected_outputs?.length) text += `Expected outputs: ${state.expected_outputs.join(', ')}\n`
          }
          if (deny.length) text += `DENIED operations: ${deny.join(', ')}\n`
          text += `\nYou MUST call nothing_capsule_guard before every command.\nDo NOT use tools outside allowed_tools.`
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_capsule_next': {
          const step = await client.getNextStep(a.run_id as string)
          if (step.is_final) return { content: [{ type: 'text', text: `Run completed (state: ${step.current_state})` }] }
          let text = `State: ${step.current_state} [${step.status}]\n\nGoal: ${step.goal}\n`
          if (step.instructions) text += `Instructions: ${step.instructions}\n`
          if (step.allowed_tools?.length) {
            text += `ALLOWED tools (ONLY these): ${step.allowed_tools.join(', ')}\n`
          }
          if (step.expected_outputs?.length) text += `Expected outputs: ${step.expected_outputs.join(', ')}\n`
          if (step.transitions?.length) {
            text += `\nTransitions:\n`
            step.transitions.forEach((t: any) => { text += `  → ${t.to} when ${t.when}\n` })
          }
          text += `\n⚠ Guard every command. Do NOT use tools outside the list above.`
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

        // ─── Experience Pack Tools ──────────────────────────────

        case 'nothing_experience_packs': {
          const result = await client.listExperiencePacks({
            installed: a.installed as boolean | undefined,
            keyword: a.keyword as string | undefined,
          })
          if (result.packs.length === 0) {
            return { content: [{ type: 'text', text: 'No experience packs found.' }] }
          }
          const text = result.packs.map((p: any) =>
            `${p.installed ? '✓' : '○'} ${p.name} [${p.id}]\n  Keywords: ${(p.keywords || []).join(', ') || '—'}\n  Capsule: ${p.capsule_id}${p.author_email ? '\n  From: ' + p.author_email : ''}`
          ).join('\n\n')
          return { content: [{ type: 'text', text }] }
        }

        case 'nothing_experience_pack_search': {
          const result = await client.searchExperiencePacks(a.keyword as string)
          if (result.packs.length === 0) {
            return { content: [{ type: 'text', text: `No experience packs matching "${a.keyword}".` }] }
          }
          const text = result.packs.map((p: any) =>
            `${p.installed ? '✓' : '○'} ${p.name} [${p.id}]\n  Keywords: ${(p.keywords || []).join(', ')}\n  Capsule: ${p.capsule_id} — use nothing_capsule_start to run`
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
