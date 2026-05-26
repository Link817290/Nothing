import { useAuthStore } from '@/stores/authStore';

const BASE = '/api';

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && typeof opts.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────
  register: (email: string, password: string, name?: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/me'),
  updateProfile: (data: { name?: string; password?: string }) =>
    request('/me', { method: 'PUT', body: JSON.stringify(data) }),

  // ── API Keys ─────────────────────────────────────────
  listKeys: () => request('/keys'),
  createKey: (name?: string) =>
    request('/keys', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteKey: (id: string) =>
    request(`/keys/${id}`, { method: 'DELETE' }),

  // ── Accounts ─────────────────────────────────────────
  listAccounts: () => request('/accounts'),
  addAccount: (data: { provider: string; email: string; password: string }) =>
    request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  removeAccount: (id: string) =>
    request(`/accounts/${id}`, { method: 'DELETE' }),
  testAccount: (id: string) =>
    request(`/accounts/${id}/test`, { method: 'POST' }),
  syncAccount: (id: string, mode: 'nmp' | 'all' = 'nmp') =>
    request(`/accounts/${id}/sync`, { method: 'POST', body: JSON.stringify({ mode }) }),

  // ── Messages ─────────────────────────────────────────
  inbox: (params?: Record<string, string>) =>
    request(`/messages/inbox${params ? '?' + new URLSearchParams(params) : ''}`),
  sent: (params?: Record<string, string>) =>
    request(`/messages/sent${params ? '?' + new URLSearchParams(params) : ''}`),
  getMessage: (id: string) => request(`/messages/${id}`),
  deleteMessage: (id: string) =>
    request(`/messages/${id}`, { method: 'DELETE' }),
  markRead: (id: string, is_read = true) =>
    request(`/messages/${id}/read`, { method: 'PUT', body: JSON.stringify({ is_read }) }),
  send: (data: { to: string; text: string; subject?: string; account_id?: string; project?: string; labels?: string[]; priority?: string }) =>
    request('/messages/send', { method: 'POST', body: JSON.stringify(data) }),
  reply: (id: string, text: string) =>
    request(`/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ text }) }),
  forward: (id: string, to: string, text?: string) =>
    request(`/messages/${id}/forward`, { method: 'POST', body: JSON.stringify({ to, text }) }),
  getThread: (id: string) =>
    request(`/threads/${id}`),
  search: (q: string) =>
    request(`/messages/search?q=${encodeURIComponent(q)}`),

  // ── Projects & Reports ───────────────────────────────
  projects: () => request('/projects'),
  reports: (params?: Record<string, string>) =>
    request(`/reports${params ? '?' + new URLSearchParams(params) : ''}`),

  // ── Admin ────────────────────────────────────────────
  adminUsers: () => request('/admin/users'),
  adminBanUser: (id: string) => request(`/admin/users/${id}/ban`, { method: 'POST' }),
  adminUnbanUser: (id: string) => request(`/admin/users/${id}/unban`, { method: 'POST' }),
  adminSettings: () => request('/admin/settings'),
  adminUpdateSettings: (data: Record<string, string>) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
  adminStatus: () => request('/admin/status'),

  // ── Admin - Mail Engine ──────────────────────────────
  adminDomains: () => request('/admin/domains'),
  adminCreateDomain: (name: string) =>
    request('/admin/domains', { method: 'POST', body: JSON.stringify({ name }) }),
  adminDeleteDomain: (name: string) =>
    request(`/admin/domains/${name}`, { method: 'DELETE' }),
  adminVerifyDomain: (name: string) =>
    request(`/admin/domains/${name}/verify`, { method: 'POST' }),
  adminMailboxes: () => request('/admin/mailboxes'),
  adminCreateMailbox: (data: { username: string; password: string; email: string; description?: string }) =>
    request('/admin/mailboxes', { method: 'POST', body: JSON.stringify(data) }),
  adminDeleteMailbox: (name: string) =>
    request(`/admin/mailboxes/${name}`, { method: 'DELETE' }),
  adminMailStatus: () => request('/admin/mail/status'),
};
