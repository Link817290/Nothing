// ─── User ──────────────────────────────────────────────────────
export interface User {
  id: string
  email: string            // platform email: link@nothingmail.shop
  username: string         // local part: link
  external_email?: string  // for verification: link@163.com
  password_hash: string
  name?: string
  is_admin: boolean
  is_banned: boolean
  created_at: string
  updated_at: string
}

// ─── Email Account (third-party mailbox bound to a user) ───────
export interface EmailAccount {
  id: string
  user_id: string
  provider: string        // gmail | qq | outlook | 163 | custom | nothing | stalwart
  email: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
  auth_user: string
  auth_pass_encrypted: string
  is_active: boolean
  last_sync_at?: string
  created_at: string
}

// ─── Message ───────────────────────────────────────────────────
export interface Message {
  id: string
  user_id: string
  account_id: string       // which email account
  from_address: string
  to_address: string
  subject: string
  content: string
  json_payload?: string
  agent?: string
  project?: string
  labels: string           // JSON array
  channel_id: string
  status: string
  source: string           // nmp | external
  thread_id?: string
  in_reply_to?: string
  direction: 'inbound' | 'outbound'
  has_attachments: boolean
  is_read: boolean
  created_at: string
  updated_at?: string
}

// ─── API Request/Response ──────────────────────────────────────
export interface RegisterRequest {
  username: string
  password: string
  name?: string
  external_email?: string  // required for non-admin (verification)
}

export interface LoginRequest {
  email: string            // accepts username or username@domain
  password: string
}

export interface AuthResponse {
  token: string
  user: { id: string; email: string; name?: string }
}

export interface AddAccountRequest {
  provider: string
  email: string
  password: string
  smtp_host?: string
  smtp_port?: number
  imap_host?: string
  imap_port?: number
}

export interface SendAttachment {
  filename: string
  content: string  // base64 encoded
  content_type?: string
}

export interface SendRequest {
  to: string
  text: string
  subject?: string
  account_id?: string
  type?: string
  agent?: string
  project?: string
  labels?: string[]
  priority?: string
  require?: string[]
  attachments?: SendAttachment[]
  help_request?: any
  execution_capsule?: any
}

export interface InboxQuery {
  unread?: boolean
  project?: string
  label?: string
  channel?: string
  source?: string
  agent?: string
  account_id?: string
  limit?: number
}
