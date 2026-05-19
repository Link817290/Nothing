import type { MailBackend, MimeMessage, SendResult } from './types.js'

/** Mail router — resolves recipient to the best backend */
export class MailRouter {
  private backends = new Map<string, MailBackend>()
  private domainMap = new Map<string, string>()
  private primaryId: string | null = null

  /** Register a backend with a channel ID */
  register(channelId: string, backend: MailBackend, domains?: string[]) {
    this.backends.set(channelId, backend)
    if (domains) {
      for (const domain of domains) {
        this.domainMap.set(domain, channelId)
      }
    }
  }

  /** Set the primary/default backend */
  setPrimary(channelId: string) {
    this.primaryId = channelId
  }

  /** Unregister a backend */
  unregister(channelId: string) {
    const backend = this.backends.get(channelId)
    if (backend) {
      backend.destroy()
      this.backends.delete(channelId)
      // Remove domain mappings
      for (const [domain, id] of this.domainMap) {
        if (id === channelId) this.domainMap.delete(domain)
      }
    }
  }

  /** Resolve which backend to use for a recipient */
  resolve(to: string): { channelId: string; backend: MailBackend } | null {
    const domain = to.split('@')[1]
    if (!domain) return null

    // Check domain-specific mapping first
    const mappedId = this.domainMap.get(domain)
    if (mappedId) {
      const backend = this.backends.get(mappedId)
      if (backend) return { channelId: mappedId, backend }
    }

    // Fall back to primary
    if (this.primaryId) {
      const backend = this.backends.get(this.primaryId)
      if (backend) return { channelId: this.primaryId, backend }
    }

    // Fall back to any available backend
    const first = this.backends.entries().next()
    if (!first.done) {
      return { channelId: first.value[0], backend: first.value[1] }
    }

    return null
  }

  /** Send a message, auto-resolving the backend */
  async send(to: string, message: MimeMessage): Promise<SendResult & { channelId: string }> {
    const resolved = this.resolve(to)
    if (!resolved) {
      return { messageId: '', accepted: false, error: 'No mail backend available', channelId: '' }
    }
    const result = await resolved.backend.send(message)
    return { ...result, channelId: resolved.channelId }
  }

  /** Poll all backends for new emails */
  async pollAll(sinceUids?: Map<string, number>): Promise<{ channelId: string; emails: Awaited<ReturnType<MailBackend['poll']>> }[]> {
    const results = []
    for (const [channelId, backend] of this.backends) {
      const uid = sinceUids?.get(channelId)
      const emails = await backend.poll(uid)
      if (emails.length > 0) {
        results.push({ channelId, emails })
      }
    }
    return results
  }

  /** Get all registered backend IDs */
  get channelIds(): string[] {
    return [...this.backends.keys()]
  }

  /** Destroy all backends */
  async destroyAll() {
    for (const backend of this.backends.values()) {
      await backend.destroy()
    }
    this.backends.clear()
    this.domainMap.clear()
  }
}
