import type { NmpType, NmpPriority, NmpStatus, NmpContext, NmpSource, NmpError } from '../types.js'

/** POST /api/messages/send */
export interface SendRequest {
  to: string
  text: string
  subject?: string
  type?: NmpType
  project?: string
  labels?: string[]
  priority?: NmpPriority
  files?: string[]
  require?: string[]
  reply_schema?: Record<string, unknown>
  ack?: boolean
}

export interface SendResponse {
  success: boolean
  message_id: string
  status: NmpStatus
}

/** GET /api/messages/inbox */
export interface InboxQuery {
  unread?: boolean
  project?: string
  label?: string
  limit?: number
  offset?: number
}

export interface InboxResponse {
  messages: MessageSummary[]
  total_unread: number
}

/** GET /api/messages/sent */
export interface SentQuery {
  project?: string
  limit?: number
  offset?: number
}

export interface SentResponse {
  messages: MessageSummary[]
}

/** GET /api/messages/:id */
export interface MessageDetail {
  id: string
  from: string
  to: string
  subject: string
  date: string
  type: NmpType
  content: string
  project?: string
  labels?: string[]
  priority?: NmpPriority
  context?: NmpContext
  channel?: ChannelRef
  status?: NmpStatus
  source?: NmpSource
  error?: NmpError
  attachments?: AttachmentInfo[]
  thread?: ThreadMessage[]
}

/** POST /api/messages/:id/reply */
export interface ReplyRequest {
  text: string
  files?: string[]
}

export interface ReplyResponse {
  success: boolean
  message_id: string
  status: NmpStatus
}

/** GET /api/projects */
export interface ProjectInfo {
  name: string
  total: number
  unread: number
  last_activity: string
}

export interface ProjectsResponse {
  projects: ProjectInfo[]
}

/** Shared types */
export interface MessageSummary {
  id: string
  from: string
  to: string
  subject: string
  preview: string
  date: string
  type: NmpType
  channel?: ChannelRef
  status?: NmpStatus
  unread?: boolean
  has_attachments: boolean
  project?: string
  labels?: string[]
  thread_count?: number
}

/** Channel reference in message responses (lightweight, not full config) */
export interface ChannelRef {
  id: string
  name: string
  email: string
}

export interface AttachmentInfo {
  filename: string
  size: number
  url: string
}

export interface ThreadMessage {
  id: string
  from: string
  preview: string
  date: string
}

/** GET /api/channels */
export interface ChannelsResponse {
  channels: ChannelInfo[]
}

export interface ChannelInfo {
  id: string
  name: string
  type: string
  email: string
  is_primary: boolean
  is_active: boolean
  created_at: string
}

/** POST /api/channels */
export interface CreateChannelRequest {
  name: string
  type: string
  email: string
  smtp_host?: string
  smtp_port?: number
  imap_host?: string
  imap_port?: number
  password?: string
  is_primary?: boolean
}

/** POST /api/channels/:id/test */
export interface TestChannelResponse {
  smtp: boolean
  imap: boolean
}

/** GET /api/reports */
export interface ReportQuery {
  period?: 'today' | 'week' | 'month'
  project?: string
}

export interface ReportResponse {
  period: { start: string; end: string; label: string }
  summary: {
    sent: number
    received: number
    replied: number
    failed: number
  }
  projects: {
    name: string
    messages: number
    threads: number
    resolved: number
  }[]
  needs_reply: {
    id: string
    from: string
    subject: string
    date: string
    project?: string
  }[]
  top_threads: {
    thread_id: string
    subject: string
    message_count: number
    status: string
    last_activity: string
  }[]
}
