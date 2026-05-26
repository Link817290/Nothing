import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Loader2, Paperclip } from 'lucide-react';
import { api } from '@/services/api';

interface Message {
  id: string;
  to: string;
  subject: string;
  preview: string;
  date: string;
  status?: string;
  project?: string;
  has_attachments: boolean;
}

const STATUS_MAP: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' | 'warning' | 'outline' }> = {
  queued: { label: 'queued', variant: 'warning' },
  sent: { label: 'sent', variant: 'outline' },
  delivered: { label: 'delivered', variant: 'success' },
  read: { label: 'read', variant: 'success' },
  replied: { label: 'replied', variant: 'success' },
  failed: { label: 'failed', variant: 'destructive' },
};

export default function Sent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<{ id: string; email: string }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('all');

  useEffect(() => {
    api.listAccounts().then((r) => setAccounts(r.accounts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: '50' };
    if (selectedAccount !== 'all') params.channel = selectedAccount;
    api.sent(params).then((r) => setMessages(r.messages || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [selectedAccount]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-10 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sent</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Outbound messages</p>
        </div>
        {accounts.length > 1 && (
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/30"
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.email}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="p-12 text-center fade-in">
            <p className="text-lg font-semibold text-muted-foreground">No sent messages</p>
            <p className="mt-1 text-sm text-muted-foreground">Messages you send will appear here</p>
          </div>
        )}
        {messages.map((m) => {
          const status = STATUS_MAP[m.status || 'sent'] || STATUS_MAP.sent;
          return (
            <Link key={m.id} to={`/messages/${m.id}`} className="block">
              <div className={cn(
                'flex items-start gap-4 border-b border-border px-10 py-4 transition-all duration-200 hover:bg-accent/50',
                m.status === 'failed' && 'bg-destructive/5',
              )}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-medium truncate text-foreground">
                      To: {m.to.split('@')[0]}
                    </span>
                    <Badge variant={status.variant} className="text-xs shrink-0">
                      {status.label}
                    </Badge>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground/70">
                      {formatDate(m.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{m.subject || '(no subject)'}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{m.preview}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {m.project && <Badge variant="outline" className="text-xs">{m.project}</Badge>}
                    {m.has_attachments && <Paperclip className="h-3 w-3 text-muted-foreground/60" />}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
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
