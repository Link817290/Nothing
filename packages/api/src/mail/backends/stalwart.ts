import type { MailBackend, MimeMessage, SendResult, RawEmail } from '../types.js'

/** Stalwart backend — self-hosted mode */
export class StalwartBackend implements MailBackend {
  readonly name = 'stalwart'

  constructor(
    private config: {
      smtpHost: string
      smtpPort: number
      imapHost: string
      imapPort: number
      apiUrl: string
      adminToken: string
    }
  ) {}

  async send(message: MimeMessage): Promise<SendResult> {
    // TODO: Use nodemailer to send via local Stalwart SMTP
    throw new Error('Not implemented')
  }

  async poll(sinceUid?: number): Promise<RawEmail[]> {
    // TODO: Use imapflow to poll local Stalwart IMAP
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
