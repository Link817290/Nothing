/** Mail backend interface — Strategy pattern */

export interface MimeMessage {
  from: string
  to: string
  subject: string
  plainText: string
  nmpMarkdown: string
  jsonPayload: string
  attachments?: { filename: string; content: Buffer; contentType: string }[]
  headers?: Record<string, string>
}

export interface SendResult {
  messageId: string
  accepted: boolean
  error?: string
}

export interface RawEmail {
  uid: number
  from: string
  to: string
  subject: string
  date: string
  headers: Record<string, string>
  parts: EmailPart[]
}

export interface EmailPart {
  contentType: string
  disposition?: string
  filename?: string
  content: string | Buffer
}

/** Every mail backend implements this interface */
export interface MailBackend {
  readonly name: string

  /** Send a MIME message */
  send(message: MimeMessage): Promise<SendResult>

  /** Poll for new emails since last check */
  poll(sinceUid?: number): Promise<RawEmail[]>

  /** Test SMTP and IMAP connectivity */
  testConnection(): Promise<{ smtp: boolean; imap: boolean }>

  /** Cleanup resources */
  destroy(): Promise<void>
}
