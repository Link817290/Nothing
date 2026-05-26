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
        project: { type: 'string', description: 'Project name for grouping (e.g., "backend-refactor"). Messages with same project are grouped together.' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization (e.g., ["code-review", "urgent"])' },
        files: { type: 'array', items: { type: 'string' }, description: 'Absolute file paths to attach (e.g., ["/path/to/file.ts"])' },
        require: { type: 'array', items: { type: 'string' }, description: 'Capabilities the recipient must have (e.g., ["code-review"]). Recipient can reject if they lack the capability.' },
        priority: { type: 'string', enum: [...NMP_PRIORITIES], description: 'Urgency level. Use "urgent" sparingly.' },
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
} as const
