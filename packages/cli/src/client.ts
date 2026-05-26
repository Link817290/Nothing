/** HTTP client for Nothing Server API */

interface ClientConfig {
  serverUrl: string
  token: string
}

export class NothingClient {
  private serverUrl: string
  private token: string

  constructor(config: ClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '')
    this.token = config.token
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.serverUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as Record<string, string>).error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  // ─── Auth (no token needed) ────────────────────────────────────

  static async register(serverUrl: string, email: string, password: string, name?: string) {
    const res = await fetch(`${serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as Record<string, string>).error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<{ token: string; user: { id: string; email: string; name?: string } }>
  }

  static async login(serverUrl: string, email: string, password: string) {
    const res = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as Record<string, string>).error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<{ token: string; user: { id: string; email: string; name?: string } }>
  }

  // ─── Accounts ──────────────────────────────────────────────────

  listAccounts() {
    return this.request<{ accounts: any[] }>('GET', '/api/accounts')
  }

  addAccount(req: { provider: string; email: string; password: string; smtp_host?: string; smtp_port?: number; imap_host?: string; imap_port?: number }) {
    return this.request<any>('POST', '/api/accounts', req)
  }

  removeAccount(id: string) {
    return this.request<{ success: boolean }>('DELETE', `/api/accounts/${id}`)
  }

  // ─── Messages ──────────────────────────────────────────────────

  send(req: { to: string; text: string; subject?: string; type?: string; agent?: string; project?: string; labels?: string[]; priority?: string; require?: string[]; files?: string[]; account_id?: string }) {
    return this.request<{ success: boolean; message_id: string; status: string }>('POST', '/api/messages/send', req)
  }

  inbox(query?: Record<string, any>) {
    const params = new URLSearchParams()
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) params.set(k, String(v))
      }
    }
    const qs = params.toString()
    return this.request<{ messages: any[]; total_unread: number }>('GET', `/api/messages/inbox${qs ? '?' + qs : ''}`)
  }

  sent(query?: Record<string, any>) {
    const params = new URLSearchParams()
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) params.set(k, String(v))
      }
    }
    const qs = params.toString()
    return this.request<{ messages: any[] }>('GET', `/api/messages/sent${qs ? '?' + qs : ''}`)
  }

  read(id: string) {
    return this.request<any>('GET', `/api/messages/${id}`)
  }

  reply(id: string, req: { text: string; files?: string[] }) {
    return this.request<{ success: boolean; message_id: string; status: string }>('POST', `/api/messages/${id}/reply`, req)
  }

  // ─── Aggregation ───────────────────────────────────────────────

  projects() {
    return this.request<{ projects: any[] }>('GET', '/api/projects')
  }

  report(query?: { period?: string; project?: string }) {
    const params = new URLSearchParams()
    if (query?.period) params.set('period', query.period)
    if (query?.project) params.set('project', query.project)
    const qs = params.toString()
    return this.request<any>('GET', `/api/reports${qs ? '?' + qs : ''}`)
  }
}
