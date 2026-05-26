import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Paperclip, CheckCheck, Trash2 } from 'lucide-react';
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

type FilterType = 'unread' | 'all' | 'nmp';

export default function Inbox() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [filter, setFilter] = useState<FilterType>('unread');
  const [loading, setLoading] = useState(true);
  const { selectedIds, toggleSelected, clearSelection, selectAll } = useMessageStore();

  const project = searchParams.get('project') || undefined;
  const q = searchParams.get('q') || undefined;

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
    api.inbox(params).then((r) => {
      setMessages(r.messages || []);
      setTotalUnread(r.total_unread || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter, project, q]);

  useEffect(() => {
    fetchMessages();
    clearSelection();
  }, [fetchMessages]);

  const handleBulkRead = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.markRead(id, true)));
    clearSelection();
    fetchMessages();
    toast({ title: `Marked ${ids.length} messages as read`, variant: 'success' });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => api.deleteMessage(id)));
    clearSelection();
    fetchMessages();
    toast({ title: `Deleted ${ids.length} messages`, variant: 'success' });
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-10 py-4">
        <div>
          {q ? (
            <h1 className="text-xl font-bold tracking-tight">Search: <span className="text-brand">{q}</span></h1>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight">
                Inbox
                {project && <span className="ml-2 font-normal text-muted-foreground">/ {project}</span>}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">{totalUnread} unread</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!q && (
            <>
              <FilterTab label="Unread" active={filter === 'unread'} count={totalUnread} onClick={() => setFilter('unread')} />
              <FilterTab label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
              <FilterTab label="NMP" active={filter === 'nmp'} onClick={() => setFilter('nmp')} />
            </>
          )}
          <Button size="pill" asChild>
            <Link to="/compose">Compose</Link>
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-brand/5 px-6 py-2 fade-in">
          <span className="text-xs font-medium text-brand">{selectedIds.size} selected</span>
          <Button variant="ghost" size="sm" onClick={handleBulkRead}>
            <CheckCheck className="h-3 w-3" /> Mark read
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
          <Button variant="ghost" size="sm" onClick={() => selectAll(messages.map((m) => m.id))}>Select all</Button>
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
              {filter === 'unread' ? 'All caught up' : filter === 'nmp' ? 'No NMP messages' : 'No messages'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === 'unread' ? 'Switch to All to see older messages' : 'Messages will appear here'}
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'flex items-start gap-4 border-b border-border px-10 py-4 transition-all duration-200 hover:bg-accent/50 group',
              m.unread && 'bg-accent/20',
              m.source === 'nmp' && 'nmp-glow',
              selectedIds.has(m.id) && 'bg-brand/5',
            )}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => { e.preventDefault(); toggleSelected(m.id); }}
              className={cn(
                'mt-1.5 h-4 w-4 shrink-0 rounded border border-border transition-all duration-200 flex items-center justify-center',
                selectedIds.has(m.id) ? 'bg-brand border-brand' : 'hover:border-muted-foreground',
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
                m.unread ? 'bg-brand shadow-[0_0_6px_rgba(245,158,11,0.4)]' : 'bg-transparent',
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
                  {m.subject || '(no subject)'}
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
