import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Paperclip, CheckCheck, Trash2, ChevronDown } from 'lucide-react';
import { api } from '@/services/api';
import { useMessageStore } from '@/stores/messageStore';
import { toast } from '@/components/ui/toast';

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  source?: string;
  unread: boolean;
  has_attachments: boolean;
  project?: string;
  labels: string[];
}

interface Account {
  id: string;
  email: string;
  provider: string;
}

type FilterType = 'unread' | 'all' | 'nmp';

export default function Inbox() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [filter, setFilter] = useState<FilterType>('unread');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const { selectedIds, toggleSelected, clearSelection, selectAll } = useMessageStore();

  const project = searchParams.get('project') || undefined;
  const q = searchParams.get('q') || undefined;

  // Load accounts
  useEffect(() => {
    api.listAccounts().then((r) => setAccounts(r.accounts || [])).catch(() => {});
  }, []);

  const fetchMessages = useCallback(() => {
    setLoading(true);
    if (q) {
      api.search(q).then((r) => {
        setMessages(r.messages || []);
        setTotalUnread(0);
      }).catch(() => {}).finally(() => setLoading(false));
      return;
    }
    const params: Record<string, string> = { limit: '50' };
    if (filter === 'unread') params.unread = 'true';
    if (filter === 'all') params.unread = 'false';
    if (filter === 'nmp') params.source = 'nmp';
    if (project) params.project = project;
    if (selectedAccount !== 'all') params.account_id = selectedAccount;
    api.inbox(params).then((r) => {
      setMessages(r.messages || []);
      setTotalUnread(r.total_unread || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter, project, q, selectedAccount]);

  useEffect(() => {
    fetchMessages();
    clearSelection();
  }, [fetchMessages]);

  const handleBulkRead = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.markRead(id, true)));
    clearSelection();
    fetchMessages();
    toast({ title: t('message.marked_read'), variant: 'success' });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.deleteMessage(id)));
    clearSelection();
    fetchMessages();
    toast({ title: t('message.deleted'), variant: 'success' });
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
        <div className="min-w-0">
          {q ? (
            <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">Search: <span className="text-brand">{q}</span></h1>
          ) : (
            <>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">
                {t('inbox.title')}
                {project && <span className="ml-2 font-normal text-muted-foreground">/ {project}</span>}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('dashboard.unread', { count: totalUnread })}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
          {/* Account selector */}
          {!q && accounts.length > 1 && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="shrink-0 rounded-lg border border-border bg-background px-2 md:px-3 py-1.5 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring/30"
            >
              <option value="all">{t('inbox.all_accounts')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
          )}

          {/* Filter tabs */}
          {!q && (
            <div className="flex items-center gap-1 shrink-0">
              <FilterTab label={t('inbox.filter.unread')} active={filter === 'unread'} count={totalUnread} onClick={() => setFilter('unread')} />
              <FilterTab label={t('inbox.filter.all')} active={filter === 'all'} onClick={() => setFilter('all')} />
              <FilterTab label={t('inbox.filter.nmp')} active={filter === 'nmp'} onClick={() => setFilter('nmp')} />
            </div>
          )}

          <Button size="sm" asChild className="shrink-0">
            <Link to="/compose">{t('nav.compose')}</Link>
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-accent px-6 py-2 fade-in">
          <span className="text-xs font-medium text-brand">{t('inbox.selected', { count: selectedIds.size })}</span>
          <Button variant="ghost" size="sm" onClick={handleBulkRead}>
            <CheckCheck className="h-3 w-3" /> {t('inbox.mark_read')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" /> {t('common.delete')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>{t('common.clear')}</Button>
          <Button variant="ghost" size="sm" onClick={() => selectAll(messages.map((m) => m.id))}>{t('inbox.select_all')}</Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="p-12 text-center fade-in">
            <p className="text-lg font-semibold text-muted-foreground">
              {filter === 'unread' ? t('inbox.all_caught_up') : filter === 'nmp' ? t('inbox.no_nmp') : t('inbox.no_messages')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === 'unread' ? t('inbox.switch_all') : t('inbox.will_appear')}
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'flex items-start gap-3 md:gap-4 border-b border-border px-4 md:px-10 py-3 md:py-4 transition-all duration-200 hover:bg-accent/50 group',
              m.unread && 'bg-accent/20',
              
              selectedIds.has(m.id) && 'bg-accent',
            )}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => { e.preventDefault(); toggleSelected(m.id); }}
              className={cn(
                'mt-1.5 h-4 w-4 shrink-0 rounded border border-border transition-all duration-200 flex items-center justify-center',
                selectedIds.has(m.id) ? 'bg-foreground border-foreground' : 'hover:border-muted-foreground',
              )}
            >
              {selectedIds.has(m.id) && (
                <svg className="h-3 w-3 text-brand-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <Link to={`/messages/${m.id}`} className="flex min-w-0 flex-1 items-start gap-3">
              {/* Unread dot */}
              <span className={cn(
                'mt-2 h-2 w-2 shrink-0 rounded-full transition-colors',
                m.unread ? 'bg-foreground' : 'bg-transparent',
              )} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className={cn('text-sm truncate', m.unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                    {m.from.split('@')[0]}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground/70">
                    {formatDate(m.date)}
                  </span>
                </div>
                <p className={cn('mt-0.5 truncate text-sm', m.unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {m.subject || t('common.no_subject')}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{m.preview}</p>
                <div className="mt-2 flex items-center gap-2">
                  {m.project && <Badge variant="outline" className="text-xs">{m.project}</Badge>}
                  {m.source === 'nmp' && <Badge variant="nmp" className="text-xs">NMP</Badge>}
                  {m.has_attachments && <Paperclip className="h-3 w-3 text-muted-foreground/60" />}
                  {m.labels?.map((l) => (
                    <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                  ))}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

function FilterTab({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm rounded-lg transition-all duration-200',
        active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
    >
      {label}
      {count != null && count > 0 && (
        <span className="ml-1.5 font-mono text-xs text-brand">{count}</span>
      )}
    </button>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
