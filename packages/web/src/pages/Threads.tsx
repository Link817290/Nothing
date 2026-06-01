import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitBranch } from 'lucide-react';
import { api } from '@/services/api';

interface ThreadSummary {
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
  const { t } = useTranslation();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listThreads().then(r => setThreads(r.threads || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 md:px-10 py-4 md:py-5">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">Threads</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{threads.length} conversations</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
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
        {threads.map((thread) => (
          <Link key={thread.thread_id} to={`/messages/${thread.thread_id}`} className="block">
            <div className={cn(
              'flex items-start gap-4 border-b border-border px-4 md:px-10 py-4 transition-all duration-200 hover:bg-accent/50',
              thread.has_unread && 'bg-accent/20',
            )}>
              <div className="mt-1 shrink-0">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className={cn('text-sm truncate', thread.has_unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                    {thread.from.split('@')[0]}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground/70">
                    {formatDate(thread.last_activity)}
                  </span>
                </div>
                <p className={cn('mt-0.5 truncate text-sm', thread.has_unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {thread.subject}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {thread.message_count} messages
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {thread.participant_count} participants
                  </Badge>
                  {thread.project && <Badge variant="outline" className="text-xs">{thread.project}</Badge>}
                  {thread.has_unread && <span className="h-2 w-2 rounded-full bg-brand" />}
                </div>
              </div>
            </div>
          </Link>
        ))}
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
