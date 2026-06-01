import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitBranch, MessageSquare, Users } from 'lucide-react';
import { api } from '@/services/api';

interface ThreadItem {
  thread_id: string;
  subject: string;
  from: string;
  message_count: number;
  participant_count: number;
  started_at: string;
  last_activity: string;
  has_unread: boolean;
  project?: string;
}

export default function Threads() {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listThreads().then(r => setThreads(r.threads || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="border-b border-border px-4 md:px-10 py-4 md:py-5">
        <h1 className="text-lg md:text-xl font-bold tracking-tight">Threads</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{threads.length} conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4">
        {loading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && threads.length === 0 && (
          <div className="p-12 text-center fade-in">
            <GitBranch className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-semibold text-muted-foreground">No threads yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Threads appear when messages have replies</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {threads.map((t) => (
            <Link key={t.thread_id} to={`/threads/${t.thread_id}`}>
              <div className={cn(
                'rounded-xl border border-border p-4 transition-all duration-200 hover:bg-accent/50 hover:border-brand/30',
                t.has_unread && 'border-brand/20 bg-accent/10',
              )}>
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm truncate', t.has_unread ? 'font-semibold' : 'text-foreground')}>
                    {t.subject}
                  </p>
                  {t.has_unread && <span className="h-2 w-2 rounded-full bg-brand shrink-0 mt-1.5" />}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{t.message_count}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{t.participant_count}</span>
                  {t.project && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t.project}</Badge>}
                  <span className="ml-auto">{formatDate(t.last_activity)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
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
  } catch { return dateStr; }
}
