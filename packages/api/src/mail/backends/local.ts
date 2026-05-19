import type { MailBackend, MimeMessage, SendResult, RawEmail } from '../types.js'

/** Local backend — no email, direct database write */
export class LocalBackend implements MailBackend {
  readonly name = 'local'

  async send(message: MimeMessage): Promise<SendResult> {
    // Local mode: don't actually send via SMTP
    // The message service writes directly to the messages table for both sender and recipient
    return {
      messageId: `local_${Date.now()}`,
      accepted: true,
    }
  }

  async poll(): Promise<RawEmail[]> {
    // Local mode: no external emails to poll
    return []
  }

  async testConnection(): Promise<{ smtp: boolean; imap: boolean }> {
    // Local mode: always connected
    return { smtp: true, imap: true }
  }

  async destroy(): Promise<void> {
    // Nothing to cleanup
  }
}
