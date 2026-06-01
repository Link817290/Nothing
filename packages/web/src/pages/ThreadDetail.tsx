import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Sparkles, Inbox, Send, Users, MessageSquare, Calendar, Maximize2, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export default function ThreadDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<any>(null);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);

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
    setStreamingText('');

    try {
      const res = await fetch(`/api/threads/${id}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stream: true }),
      });

      if (!res.ok || !res.body) throw new Error('Failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            if (json.chunk) {
              full += json.chunk;
              setStreamingText(full);
            }
          } catch {}
        }
      }

      if (full) {
        setSummaries(prev => [{ id: `new_${Date.now()}`, summary: full, created_at: new Date().toISOString(), generated_by: 'manual' }, ...prev]);
      }
    } catch {}
    setSummarizing(false);
    setStreamingText('');
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!summary) return <div className="p-12 text-center text-muted-foreground">Thread not found</div>;

  const participants: string[] = summary.participants || [];
  const days: any[] = summary.days || [];
  const total: number = summary.total || 0;
  const allMessages: any[] = days.flatMap((d: any) => d.messages || []);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 md:px-10 py-4 md:py-5">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/threads"><ArrowLeft className="h-4 w-4" /> {t('threads.title')}</Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">{summary.subject}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total} {t('threads.messages')} · {participants.length} {t('threads.participants')} · {days.length} {t('threads.days')}
            {summary.project && <Badge variant="outline" className="text-xs ml-2 px-1.5 py-0">{summary.project}</Badge>}
          </p>
        </div>
        {total >= 5 && (
          <Button variant="outline" size="sm" onClick={handleSummarize} disabled={summarizing}>
            {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline ml-1">{t('threads.summarize')}</span>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 md:py-6 space-y-6 fade-in">
        {/* Participants */}
        <div className="flex flex-wrap gap-2">
          {participants.map((p: string) => (
            <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-sm">
              <span className="h-2 w-2 rounded-full bg-brand" />{p}
            </span>
          ))}
        </div>

        {/* Canvas */}
        {allMessages.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('threads.thread_map')}</h2>
              <button
                onClick={() => setCanvasFullscreen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Expand"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <ThreadCanvas messages={allMessages} threadId={id || ''} />
          </div>
        )}

        {/* Streaming output */}
        {streamingText && (
          <div className="rounded-xl border border-brand/30 bg-accent/10 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-brand animate-pulse" />
              <span className="text-sm text-muted-foreground">{t('threads.summarize')}...</span>
            </div>
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">{streamingText}<span className="animate-pulse">▊</span></div>
          </div>
        )}

        {/* AI Summaries */}
        {summaries.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              <Sparkles className="h-3 w-3 inline mr-1" /> {t('threads.summaries')}
            </h2>
            {summaries.map((s: any) => (
              <div key={s.id} className="rounded-xl border border-border p-4 md:p-5">
                <span className="text-xs text-muted-foreground">{s.generated_by} · {formatDate(s.created_at)}</span>
                <div className="mt-2 text-sm text-foreground whitespace-pre-line leading-relaxed">{s.summary}</div>
              </div>
            ))}
          </div>
        )}

        {/* Daily message links */}
        {days.map((day: any) => (
          <div key={day.date}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              {day.date} · {day.message_count} {t('threads.messages')}
            </h2>
            <div className="space-y-1">
              {day.messages.map((m: any) => (
                <Link to={`/messages/${m.id}`} key={m.id} className="block">
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-accent/50 transition-colors">
                    {m.direction === 'outbound'
                      ? <Send className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                    <span className="font-medium w-20 shrink-0 truncate">{m.from}</span>
                    <span className="text-muted-foreground truncate flex-1">{m.preview}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{m.time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Canvas */}
      {canvasFullscreen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setCanvasFullscreen(false)} />
          <div className="fixed inset-4 md:inset-10 z-50 flex flex-col rounded-2xl border border-border bg-background shadow-2xl fade-in">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold">{t('threads.thread_map')}</h2>
              <button onClick={() => setCanvasFullscreen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-6">
              <ThreadCanvas messages={allMessages} threadId={id || ''} fullscreen />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────

function ThreadCanvas({ messages, threadId, fullscreen }: { messages: any[]; threadId: string; fullscreen?: boolean }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [drag, setDrag] = useState({ dragging: false, startX: 0, scrollX: 0 });

  const NODE_W = fullscreen ? 280 : 240, NODE_H = fullscreen ? 72 : 64, GAP_X = fullscreen ? 72 : 56, GAP_Y = 24;
  const positions = new Map<number, { x: number; y: number }>();

  messages.forEach((_, i) => {
    positions.set(i, { x: i * (NODE_W + GAP_X), y: 0 });
  });

  const canvasW = Math.max(600, messages.length * (NODE_W + GAP_X));
  const canvasH = NODE_H + 40;

  const onMouseDown = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    setDrag({ dragging: true, startX: e.clientX, scrollX: el.scrollLeft });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.dragging || !containerRef.current) return;
    containerRef.current.scrollLeft = drag.scrollX - (e.clientX - drag.startX);
  };
  const onMouseUp = () => setDrag(d => ({ ...d, dragging: false }));

  const onTouchStart = (e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || !e.touches[0]) return;
    setDrag({ dragging: true, startX: e.touches[0].clientX, scrollX: el.scrollLeft });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.dragging || !containerRef.current || !e.touches[0]) return;
    containerRef.current.scrollLeft = drag.scrollX - (e.touches[0].clientX - drag.startX);
  };

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-xl border border-border bg-muted/20 cursor-grab active:cursor-grabbing touch-pan-x"
      style={fullscreen ? {} : { maxHeight: '140px' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      <svg width={canvasW} height={canvasH} className="select-none" style={{ fontFamily: 'var(--font-sans)' }}>
        {messages.map((_, i) => {
          if (i === 0) return null;
          const prev = positions.get(i - 1)!;
          const curr = positions.get(i)!;
          return (
            <line
              key={`line-${i}`}
              x1={prev.x + NODE_W} y1={prev.y + NODE_H / 2 + 16}
              x2={curr.x} y2={curr.y + NODE_H / 2 + 16}
              stroke="var(--border)" strokeWidth="1.5"
            />
          );
        })}
        {messages.map((m, i) => {
          const pos = positions.get(i)!;
          return (
            <g
              key={i}
              transform={`translate(${pos.x}, ${pos.y + 16})`}
              onClick={() => navigate(`/messages/${m.id}`)}
              className="cursor-pointer"
            >
              <rect
                width={NODE_W} height={NODE_H} rx="10"
                fill="var(--card)" stroke="var(--border)" strokeWidth="1"
              />
              <text x="12" y="26" fontSize="14" fontWeight="500" fill="var(--foreground)">
                {m.from}
              </text>
              <text x="12" y="46" fontSize="13" fill="var(--muted-foreground)">
                {(m.preview || '').slice(0, 28)}{(m.preview || '').length > 28 ? '…' : ''}
              </text>
              <text x={NODE_W - 12} y="26" fontSize="12" fill="var(--muted-foreground)" textAnchor="end">
                {m.time}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
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
