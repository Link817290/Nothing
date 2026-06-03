import { NMP_BUILTIN_TYPES, NMP_PRIORITIES, NMP_DEFAULTS } from './types.js'

/** MCP tool definitions for Nothing — rich descriptions for Agent understanding */

export const NMP_TOOLS = {
  nothing_send: {
    name: 'nothing_send',
    description: 'Send an email or NMP message. Use when the user wants to notify someone, share code, ask a question, or delegate a task. Supports file attachments and project tagging. Example triggers: "send this to bob", "email alice about the bug", "notify the team".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address (e.g., bob@nothing.email, alice@gmail.com)' },
        text: { type: 'string', description: 'Message body. For code discussions, include file paths and line numbers.' },
        agent: { type: 'string', description: 'Your agent identity (e.g., "claude-code", "cursor"). Auto-detected from MCP context.' },
        subject: { type: 'string', description: `Subject line. Auto-generated from first ${NMP_DEFAULTS.subjectMaxLength} chars if omitted.` },
        type: { type: 'string', enum: [...NMP_BUILTIN_TYPES], description: 'Message type: nmp:chat, nmp:task, nmp:reply, nmp:notification, nmp:code-review, nmp:report, nmp:approval' },
        project: { type: 'string', description: 'Project name. Must be an existing project created by user. Use nothing_projects to check available projects. Do NOT invent new names. Leave empty if user does not specify.' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization (e.g., ["code-review", "urgent"])' },
        files: { type: 'array', items: { type: 'string' }, description: 'Absolute file paths to attach (e.g., ["/path/to/file.ts"])' },
        require: { type: 'array', items: { type: 'string' }, description: 'Capabilities the recipient must have (e.g., ["code-review"]). Recipient can reject if they lack the capability.' },
        priority: { type: 'string', enum: [...NMP_PRIORITIES], description: 'Urgency level. Use "urgent" sparingly.' },
        context: { type: 'object', properties: { repo: { type: 'string' }, file: { type: 'string' }, lines: { type: 'string' }, language: { type: 'string' } }, description: 'Code context: repo, file, lines, language. Attach when discussing code.' },
        capabilities: { type: 'array', items: { type: 'string' }, description: 'Capabilities this sender offers (e.g., ["code-review", "deploy"]).' },
        reply_schema: { type: 'object', description: 'JSON Schema the reply must conform to. Use when you need structured responses.' },
        conversation_id: { type: 'string', description: 'Conversation/thread ID to continue an existing conversation.' },
        expires: { type: 'string', description: 'ISO 8601 expiry timestamp. Message becomes stale after this time.' },
        help_request: { type: 'object', description: 'Structured help request with goal, background, constraints, and expected artifacts.' },
        execution_capsule: { type: 'object', description: 'Execution Capsule with state machine, tool policy, validators.' },
        ack: { type: 'boolean', description: 'Request delivery acknowledgment from recipient.' },
      },
      required: ['to', 'text'],
    },
  },

  nothing_inbox: {
    name: 'nothing_inbox',
    description: 'Check inbox for received messages. Use when the user asks "any new messages?", "check my mail", "what did bob send?", or "show messages from gmail". Supports filtering by channel (gmail/qq/nothing), sender, project, and labels.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        unread: { type: 'boolean', description: 'Only unread messages (default: true). Set false to see all.' },
        project: { type: 'string', description: 'Filter by project name' },
        label: { type: 'string', description: 'Filter by label' },
        channel: { type: 'string', description: 'Filter by email channel: gmail, qq, outlook, nothing, local' },
        source: { type: 'string', enum: ['nmp', 'external'], description: 'Filter by message type: "nmp" for Agent messages, "external" for regular emails' },
        agent: { type: 'string', description: 'Filter by sending agent name (exact match, e.g., "claude-code", "cursor", "codex")' },
        limit: { type: 'number', description: `Max messages to return (default: ${NMP_DEFAULTS.messageLimit})` },
      },
    },
  },

  nothing_sent: {
    name: 'nothing_sent',
    description: 'Check sent messages and their delivery status. Use when the user asks "did my message arrive?", "delivery status", or "what did I send?". Shows 6 statuses: queued → sent → delivered → read → replied / failed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: `Max messages to return (default: ${NMP_DEFAULTS.messageLimit})` },
        project: { type: 'string', description: 'Filter by project' },
      },
    },
  },

  nothing_read: {
    name: 'nothing_read',
    description: 'Read a specific message in full. Use when the user says "open that message", "read it", "show me the details". Returns complete content, code context, attachments, and thread history. Marks message as read.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Message ID (from inbox or sent listing)' },
      },
      required: ['id'],
    },
  },

  nothing_reply: {
    name: 'nothing_reply',
    description: 'Reply to a message within its thread. Use when the user says "reply to that", "tell them yes", "respond with...". Automatically inherits project, labels, and thread context from the original message.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Message ID to reply to' },
        text: { type: 'string', description: 'Reply body' },
        files: { type: 'array', items: { type: 'string' }, description: 'File paths to attach' },
      },
      required: ['id', 'text'],
    },
  },

  nothing_projects: {
    name: 'nothing_projects',
    description: 'List all projects with message counts and unread status. Use when the user asks "what projects do I have?", "project overview", or "which projects have unread messages?".',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  nothing_project_create: {
    name: 'nothing_project_create',
    description: 'Create a new project. Projects organize threads and messages. Use when user says "create a project for...", "start a new project".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name (e.g., "backend-refactor", "q3-launch")' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['name'],
    },
  },

  nothing_project_delete: {
    name: 'nothing_project_delete',
    description: 'Delete a project. Messages are untagged but not deleted. Use when user says "remove that project", "delete project X".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Project ID or name' },
      },
      required: ['id'],
    },
  },

  nothing_report: {
    name: 'nothing_report',
    description: 'Generate an activity report showing messages sent/received, project breakdown, items needing reply, and top threads. Use when the user asks "weekly summary", "what happened this week?", "give me a report", or "any messages I missed?".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period (default: week)' },
        project: { type: 'string', description: 'Filter report to a specific project' },
      },
    },
  },
  nothing_search: {
    name: 'nothing_search',
    description: 'Search messages by keyword. Use when the user asks "find messages about...", "search for...", or "any messages mentioning...".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (keyword, sender name, subject text)' },
        project: { type: 'string', description: 'Filter by project' },
        limit: { type: 'number', description: 'Max results (default: 20)' },
      },
      required: ['query'],
    },
  },

  nothing_forward: {
    name: 'nothing_forward',
    description: 'Forward a message to another recipient. The original content is included. Use when the user says "forward this to...", "send this to bob too".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Message ID to forward' },
        to: { type: 'string', description: 'Recipient email address' },
        text: { type: 'string', description: 'Optional note to add above the forwarded content' },
      },
      required: ['id', 'to'],
    },
  },

  nothing_delete: {
    name: 'nothing_delete',
    description: 'Delete a message. Use when the user says "delete that message", "remove it". This is permanent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Message ID to delete' },
      },
      required: ['id'],
    },
  },

  nothing_mark: {
    name: 'nothing_mark',
    description: 'Mark a message as read or unread. Use when the user says "mark as read", "mark unread", "I\'ll read this later".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Message ID' },
        state: { type: 'string', enum: ['read', 'unread'], description: 'Mark as read or unread' },
      },
      required: ['id', 'state'],
    },
  },

  nothing_threads: {
    name: 'nothing_threads',
    description: 'List conversation threads. Threads belong to projects — filter by project to see threads under a specific project. Use when the user asks "what conversations do I have?", "show threads", "active discussions".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project: { type: 'string', description: 'Show threads belonging to this project' },
        limit: { type: 'number', description: 'Max threads (default: 20)' },
      },
    },
  },

  // ─── Execution Capsule Tools ────────────────────────────────

  nothing_capsule_inspect: {
    name: 'nothing_capsule_inspect',
    description: 'Inspect an Execution Capsule from a received message. Shows state machine, tool policy, validators, and artifact specs. Use when you receive an nmp:execution-capsule message.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Message ID or Capsule ID to inspect' },
      },
      required: ['id'],
    },
  },

  nothing_capsule_start: {
    name: 'nothing_capsule_start',
    description: 'Start executing a capsule. Creates a run and returns the initial state with goal, allowed tools, and expected outputs. Use after inspecting a capsule to begin the task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        capsule_id: { type: 'string', description: 'Capsule ID to execute' },
        inputs: { type: 'object', description: 'Input values required by the capsule (e.g., { topic: "AI startup", slides: 10 })' },
      },
      required: ['capsule_id'],
    },
  },

  nothing_capsule_next: {
    name: 'nothing_capsule_next',
    description: 'Get the current state of a running capsule. Returns the goal, instructions, allowed tools, expected outputs, and validators for the current step. Call this to know what to do next.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        run_id: { type: 'string', description: 'Run ID from capsule_start' },
      },
      required: ['run_id'],
    },
  },

  nothing_capsule_guard: {
    name: 'nothing_capsule_guard',
    description: 'Check if a command is allowed by the capsule tool policy BEFORE executing it. Returns allow/deny/confirm with reason. Always call this before running shell commands during capsule execution.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        run_id: { type: 'string', description: 'Run ID' },
        command: { type: 'string', description: 'The command to check (e.g., "python build_ppt.py", "npm install x")' },
      },
      required: ['run_id', 'command'],
    },
  },

  nothing_capsule_event: {
    name: 'nothing_capsule_event',
    description: 'Record an event during capsule execution. Use to log state transitions, tool calls, validation results, or notes. This builds the execution timeline.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        run_id: { type: 'string', description: 'Run ID' },
        type: { type: 'string', enum: ['state_entered', 'state_completed', 'tool_requested', 'tool_allowed', 'tool_denied', 'validator_passed', 'validator_failed', 'artifact_created', 'blocked', 'note'], description: 'Event type' },
        state: { type: 'string', description: 'Current state name' },
        message: { type: 'string', description: 'Event description' },
        data: { type: 'object', description: 'Additional event data' },
      },
      required: ['run_id', 'type'],
    },
  },

  nothing_capsule_validate: {
    name: 'nothing_capsule_validate',
    description: 'Validate an artifact against capsule validators. Call after generating the expected output to check if it meets requirements (file exists, correct format, structure rules, etc.).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        run_id: { type: 'string', description: 'Run ID' },
        artifact_path: { type: 'string', description: 'Path to the artifact file to validate' },
        artifact_name: { type: 'string', description: 'Name of the artifact (matches capsule artifact spec)' },
      },
      required: ['run_id', 'artifact_path'],
    },
  },
} as const
