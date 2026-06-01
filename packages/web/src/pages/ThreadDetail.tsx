import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Sparkles, Inbox, Send, GitBranch } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<any>(null);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getThreadSummary(id),
      fetch(`/api/threads/${id}/summaries`, {
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` },
      }).then(r => r.json()).catch(() => ({ summaries: [] })),
    ]).then(([sum, sums]) => {
      setSummary(sum);
      setSummaries(sums.summaries || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleSummarize = async () => {
    if (!id) return;
    setSummarizing(true);
    try {
      const res = await fetch(`/api/threads/${id}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
          'Content-Type': 'application/json',
        },
      }).then(r => r.json());
      if (res.summary) {
        setSummaries(prev => [{ id: res.id, summary: res.summary, created_at: new Date().toISOString(), generated_by: 'manual' }, ...prev]);
      }
    } catch {}
    setSummarizing(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!summary) return <div className="p-12 text-center text-muted-foreground">Thread not found</div>;

  const participants = summary.participants || [];
  const days = summary.days || [];
  const total = summary.total || 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 md:px-6 py-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/threads"><ArrowLeft className="h-4 w-4" /> Threads</Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{summary.subject}</h1>
          {summary.project && <Badge variant="outline" className="text-[10px] mt-0.5">{summary.project}</Badge>}
        </div>
        {total >= 5 && (
          <Button variant="outline" size="sm" onClick={handleSummarize} disabled={summarizing}>
            {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Summarize
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-6 fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">messages</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold">{participants.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">participants</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold">{days.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">days</p>
          </div>
        </div>

        {/* Participants */}
        <div className="flex flex-wrap gap-2">
          {participants.map((p: string) => (
            <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {p}
            </span>
          ))}
        </div>

        {/* AI Summaries */}
        {summaries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 inline mr-1" /> Summaries
            </p>
            {summaries.map((s: any) => (
              <div key={s.id} className="rounded-xl border border-border p-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">{s.generated_by} · {formatDate(s.created_at)}</span>
                </div>
                <div className="text-foreground whitespace-pre-line leading-relaxed">{s.summary}</div>
              </div>
            ))}
          </div>
        )}

        {/* Daily Messages — compact, just links */}
        {days.map((day: any) => (
          <div key={day.date}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {day.date} · {day.message_count} messages
            </p>
            <div className="space-y-1">
              {day.messages.map((m: any) => (
                <Link to={`/messages/${m.id}`} key={m.id} className="block">
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent/50 transition-colors">
                    {m.direction === 'outbound'
                      ? <Send className="h-3 w-3 text-muted-foreground shrink-0" />
                      : <Inbox className="h-3 w-3 text-muted-foreground shrink-0" />
                    }
                    <span className="font-medium w-16 shrink-0 truncate">{m.from}</span>
                    <span className="text-muted-foreground truncate flex-1">{m.preview}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{m.time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}
