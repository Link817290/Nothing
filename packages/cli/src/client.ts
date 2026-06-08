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
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
    }
    if (body) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${this.serverUrl}${path}`, {
      method,
      headers,
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

  send(req: { to: string; text: string; subject?: string; type?: string; agent?: string; project?: string; labels?: string[]; priority?: string; require?: string[]; attachments?: { filename: string; content: string; content_type?: string }[]; account_id?: string; context?: { repo?: string; file?: string; lines?: string; language?: string }; capabilities?: string[]; reply_schema?: Record<string, unknown>; conversation_id?: string; expires?: string; help_request?: Record<string, unknown>; ack?: boolean }) {
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

  reply(id: string, req: { text: string; attachments?: { filename: string; content: string; content_type?: string }[] }) {
    return this.request<{ success: boolean; message_id: string; status: string }>('POST', `/api/messages/${id}/reply`, req)
  }

  // ─── Message actions ────────────────────────────────────────────

  markRead(id: string, isRead: boolean) {
    return this.request<{ success: boolean }>('PUT', `/api/messages/${id}/read`, { is_read: isRead })
  }

  deleteMessage(id: string) {
    return this.request<{ success: boolean }>('DELETE', `/api/messages/${id}`)
  }

  forward(id: string, to: string, text?: string) {
    return this.request<{ success: boolean; message_id: string }>('POST', `/api/messages/${id}/forward`, { to, text })
  }

  search(q: string, opts?: { project?: string; limit?: number }) {
    const params = new URLSearchParams({ q })
    if (opts?.project) params.set('project', opts.project)
    if (opts?.limit) params.set('limit', String(opts.limit))
    return this.request<{ messages: any[] }>('GET', `/api/messages/search?${params}`)
  }

  // ─── Accounts ─────────────────────────────────────────────────

  syncAccount(id: string, mode: 'nmp' | 'all' = 'nmp') {
    return this.request<{ success: boolean; new_messages: number }>('POST', `/api/accounts/${id}/sync`, { mode })
  }

  testAccount(id: string) {
    return this.request<{ smtp: boolean; imap: boolean }>('POST', `/api/accounts/${id}/test`)
  }

  // ─── Aggregation ───────────────────────────────────────────────

  projects() {
    return this.request<{ projects: any[] }>('GET', '/api/projects')
  }

  createProject(name: string, description?: string) {
    return this.request<{ id: string; name: string; description?: string }>('POST', '/api/projects', { name, description })
  }

  updateProject(id: string, data: { name?: string; description?: string }) {
    return this.request<{ success: boolean }>('PUT', `/api/projects/${id}`, data)
  }

  deleteProject(id: string, mode: 'unlink' | 'delete_all' = 'unlink') {
    return this.request<{ success: boolean }>('DELETE', `/api/projects/${id}?mode=${mode}`)
  }

  report(query?: { period?: string; project?: string }) {
    const params = new URLSearchParams()
    if (query?.period) params.set('period', query.period)
    if (query?.project) params.set('project', query.project)
    const qs = params.toString()
    return this.request<any>('GET', `/api/reports${qs ? '?' + qs : ''}`)
  }

  // ─── Threads ───────────────────────────────────────────────────

  listThreads(query?: Record<string, string>) {
    const params = new URLSearchParams()
    if (query) for (const [k, v] of Object.entries(query)) if (v) params.set(k, v)
    const qs = params.toString()
    return this.request<{ threads: any[] }>('GET', `/api/threads${qs ? '?' + qs : ''}`)
  }

  getThread(threadId: string) {
    return this.request<{ messages: any[] }>('GET', `/api/threads/${threadId}`)
  }

  getThreadSummaries(threadId: string) {
    return this.request<{ summaries: any[] }>('GET', `/api/threads/${threadId}/summaries`)
  }

  summarizeThread(threadId: string, messageIds?: string[]) {
    return this.request<{ id: string; summary: string }>('POST', `/api/threads/${threadId}/summarize`, messageIds ? { message_ids: messageIds } : {})
  }

  // ─── Attachments ────────────────────────────────────────────────

  async downloadAttachment(id: string): Promise<{ filename: string; data: Buffer }> {
    const res = await fetch(`${this.serverUrl}/api/attachments/${id}/download`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
    })
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const rawFilename = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `attachment_${id}`
    const filename = decodeURIComponent(rawFilename)
    const data = Buffer.from(await res.arrayBuffer())
    return { filename, data }
  }

  // ─── Sages ─────────────────────────────────────────────────────

  listSages(query?: { installed?: boolean; keyword?: string }) {
    const params = new URLSearchParams()
    if (query?.installed !== undefined) params.set('installed', String(query.installed))
    if (query?.keyword) params.set('keyword', query.keyword)
    const qs = params.toString()
    return this.request<{ sages: any[] }>('GET', `/api/sages${qs ? '?' + qs : ''}`)
  }

  searchSages(keyword: string) {
    return this.request<{ sages: any[] }>('GET', `/api/sages/search?q=${encodeURIComponent(keyword)}`)
  }

  installSage(id: string) {
    return this.request<{ success: boolean }>('PUT', `/api/sages/${id}/install`)
  }

  uninstallSage(id: string) {
    return this.request<{ success: boolean }>('PUT', `/api/sages/${id}/uninstall`)
  }
}
