import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, GitBranch, ChevronDown, Sparkles } from 'lucide-react';
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
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, any[]>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);

  useEffect(() => {
    api.listThreads().then(r => setThreads(r.threads || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (threadId: string) => {
    if (expanded === threadId) { setExpanded(null); return }
    setExpanded(threadId);
    if (!summaries[threadId]) {
      try {
        const res = await (api as any).request?.(`/threads/${threadId}/summaries`) ||
          await fetch(`/api/threads/${threadId}/summaries`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('nothing-token') || ''}` }
          }).then(r => r.json());
        setSummaries(prev => ({ ...prev, [threadId]: res.summaries || [] }));
      } catch {}
    }
  };

  const handleSummarize = async (threadId: string) => {
    setSummarizing(threadId);
    try {
      const res = await fetch(`/api/threads/${threadId}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('nothing-token') || ''}`,
          'Content-Type': 'application/json',
        },
      }).then(r => r.json());
      if (res.summary) {
        setSummaries(prev => ({
          ...prev,
          [threadId]: [{ id: res.id, summary: res.summary, created_at: new Date().toISOString(), generated_by: 'manual' }, ...(prev[threadId] || [])],
        }));
      }
    } catch {}
    setSummarizing(null);
  };

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
        <div className="divide-y divide-border">
          {threads.map((thread) => (
            <div key={thread.thread_id}>
              {/* Card */}
              <div className={cn(
                'px-4 md:px-10 py-4 transition-all duration-200 hover:bg-accent/30',
                thread.has_unread && 'bg-accent/10',
              )}>
                <div className="flex items-center gap-3">
                  <Link to={`/messages/${thread.thread_id}`} className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-sm truncate', thread.has_unread ? 'font-semibold' : 'text-muted-foreground')}>
                        {thread.subject}
                      </span>
                      {thread.has_unread && <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{thread.participant_count}p · {thread.message_count}m</span>
                      {thread.project && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{thread.project}</Badge>}
                      <span className="ml-auto">{formatDate(thread.last_activity)}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    {thread.message_count >= 5 && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-brand"
                        onClick={() => handleSummarize(thread.thread_id)}
                        disabled={summarizing === thread.thread_id}
                        title="Generate summary"
                      >
                        {summarizing === thread.thread_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => toggleExpand(thread.thread_id)}
                    >
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded === thread.thread_id && 'rotate-180')} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded: summaries */}
              {expanded === thread.thread_id && (
                <div className="px-4 md:px-10 pb-4 fade-in">
                  {(summaries[thread.thread_id] || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      {thread.message_count < 5 ? 'Need at least 5 messages for summary' : 'No summaries yet. Click ✨ to generate.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(summaries[thread.thread_id] || []).map((s: any) => (
                        <div key={s.id} className="rounded-lg border border-border bg-accent/20 p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Sparkles className="h-3 w-3 text-brand" />
                            <span className="text-xs text-muted-foreground">{s.generated_by} · {formatDate(s.created_at)}</span>
                          </div>
                          <div className="text-foreground whitespace-pre-line leading-relaxed">{s.summary}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
