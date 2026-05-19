import type { MailBackend, MimeMessage, SendResult, RawEmail } from '../types.js'

/** SMTP backend — email account mode (Gmail, Outlook, QQ, Nothing, etc.) */
export class SmtpBackend implements MailBackend {
  readonly name: string

  constructor(
    private config: {
      name: string
      email: string
      smtpHost: string
      smtpPort: number
      imapHost: string
      imapPort: number
      password: string
    }
  ) {
    this.name = config.name
  }

  async send(message: MimeMessage): Promise<SendResult> {
    // TODO: Use nodemailer to send via external SMTP
    throw new Error('Not implemented')
  }

  async poll(sinceUid?: number): Promise<RawEmail[]> {
    // TODO: Use imapflow to poll external IMAP
    throw new Error('Not implemented')
  }

  async testConnection(): Promise<{ smtp: boolean; imap: boolean }> {
    // TODO: Test SMTP and IMAP connectivity
    throw new Error('Not implemented')
  }

  async destroy(): Promise<void> {
    // Cleanup IMAP connections
  }
}
