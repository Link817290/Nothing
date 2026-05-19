// HTTP client for Nothing API
// All CLI commands and MCP tools call this

import type {
  SendRequest, SendResponse,
  InboxQuery, InboxResponse,
  SentQuery, SentResponse,
  ReportQuery, ReportResponse,
  MessageDetail,
  ReplyRequest, ReplyResponse,
  ProjectsResponse,
} from '@nothingmail/nmp/api'

interface Config {
  token: string
  api_host: string
}

export class NothingClient {
  private token: string
  private apiHost: string

  constructor(config: Config) {
    this.token = config.token
    this.apiHost = config.api_host
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.apiHost}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as Record<string, string>).message || `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  send(req: SendRequest) {
    return this.request<SendResponse>('POST', '/api/messages/send', req)
  }

  inbox(query?: InboxQuery) {
    const params = new URLSearchParams()
    if (query?.unread !== undefined) params.set('unread', String(query.unread))
    if (query?.project) params.set('project', query.project)
    if (query?.label) params.set('label', query.label)
    if ((query as any)?.channel) params.set('channel', (query as any).channel)
    if ((query as any)?.source) params.set('source', (query as any).source)
    if ((query as any)?.agent) params.set('agent', (query as any).agent)
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return this.request<InboxResponse>('GET', `/api/messages/inbox${qs ? '?' + qs : ''}`)
  }

  sent(query?: SentQuery) {
    const params = new URLSearchParams()
    if (query?.project) params.set('project', query.project)
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return this.request<SentResponse>('GET', `/api/messages/sent${qs ? '?' + qs : ''}`)
  }

  read(id: string) {
    return this.request<MessageDetail>('GET', `/api/messages/${id}`)
  }

  reply(id: string, req: ReplyRequest) {
    return this.request<ReplyResponse>('POST', `/api/messages/${id}/reply`, req)
  }

  projects() {
    return this.request<ProjectsResponse>('GET', '/api/projects')
  }

  report(query?: ReportQuery) {
    const params = new URLSearchParams()
    if (query?.period) params.set('period', query.period)
    if (query?.project) params.set('project', query.project)
    const qs = params.toString()
    return this.request<ReportResponse>('GET', `/api/reports${qs ? '?' + qs : ''}`)
  }
}
