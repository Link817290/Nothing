import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReactFlow, Background, Controls, Handle, Position, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
  const [threadMessages, setThreadMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getThreadSummary(id),
      fetch(`/api/threads/${id}/summaries`, {
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` },
      }).then(r => r.json()).catch(() => ({ summaries: [] })),
      api.getThread(id),
    ]).then(([sum, sums, thread]) => {
      setSummary(sum);
      setSummaries(sums.summaries || []);
      setThreadMessages(thread.messages || []);
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
        {threadMessages.length > 1 && (
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
            <ThreadCanvas messages={threadMessages} threadId={id || ''} />
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
              <ThreadCanvas messages={threadMessages} threadId={id || ''} fullscreen />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── ReactFlow Canvas ───────────────────────────────────────────

function MessageNode({ data }: { data: any }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/messages/${data.msgId}`)}
      className="rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:border-brand/50 hover:shadow-sm transition-all"
      style={{ width: 220, fontFamily: 'var(--font-sans)' }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{data.from?.split('@')[0] || data.from}</span>
        <span className="text-xs text-muted-foreground">{data.time || formatDate(data.date)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground truncate">{data.preview}</p>
      <span className="text-[10px] text-muted-foreground/60">{data.direction === 'outbound' ? '↗ sent' : '↙ received'}</span>
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
    </div>
  );
}

const nodeTypes = { message: MessageNode };

function ThreadCanvas({ messages, threadId, fullscreen }: { messages: any[]; threadId: string; fullscreen?: boolean }) {
  const GAP_X = 300, GAP_Y = 120;
  const edgeStyle = { stroke: 'var(--muted-foreground)', strokeWidth: 1.5, opacity: 0.4 };

  // 1. Stable sort by time
  const msgs = [...messages].sort((a, b) => {
    const ta = a.time || '', tb = b.time || '';
    return ta.localeCompare(tb);
  });
  const idToIndex = new Map<string, number>(msgs.map((m, i) => [m.id, i]));

  // 2. Build parent-child with fallback: missing parent → attach to nearest predecessor
  const childrenMap = new Map<number, number[]>();
  const roots: number[] = [];
  const parentOf = new Map<number, number>(); // child → parent

  msgs.forEach((m, i) => {
    let parentIdx: number | undefined;

    if (m.in_reply_to) {
      parentIdx = idToIndex.get(m.in_reply_to);
      if (parentIdx === undefined && i > 0) parentIdx = i - 1;
    } else if (i > 0) {
      // No in_reply_to (old data) → chain to previous message
      parentIdx = i - 1;
    }

    if (parentIdx !== undefined && parentIdx !== i) {
      if (!childrenMap.has(parentIdx)) childrenMap.set(parentIdx, []);
      childrenMap.get(parentIdx)!.push(i);
      parentOf.set(i, parentIdx);
    } else {
      roots.push(i);
    }
  });

  // 3. Unified DFS layout (no isLinear special case)
  const positions = new Map<number, { x: number; y: number }>();
  let nextRow = 0;

  function layoutTree(idx: number, depth: number) {
    const children = childrenMap.get(idx) || [];
    if (children.length === 0) {
      positions.set(idx, { x: depth * GAP_X, y: nextRow * GAP_Y });
      nextRow++;
    } else {
      const startRow = nextRow;
      for (const child of children) layoutTree(child, depth + 1);
      const endRow = nextRow - 1;
      positions.set(idx, { x: depth * GAP_X, y: ((startRow + endRow) / 2) * GAP_Y });
    }
  }

  for (const root of roots) layoutTree(root, 0);

  // 4. Nodes + edges from same tree
  const nodes: Node[] = msgs.map((m, i) => ({
    id: String(i),
    type: 'message',
    position: positions.get(i) || { x: i * GAP_X, y: 0 },
    data: { msgId: m.id, from: m.from, preview: m.preview, time: m.time, date: m.date, direction: m.direction },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edges: Edge[] = [];
  parentOf.forEach((parent, child) => {
    edges.push({ id: `e${parent}-${child}`, source: String(parent), target: String(child), type: 'smoothstep', style: edgeStyle });
  });

  return (
    <div
      className={cn(
        fullscreen ? 'w-full h-full' : 'rounded-xl border border-border bg-muted/20',
      )}
      style={fullscreen ? { height: '100%' } : { height: Math.min(350, Math.max(200, (nextRow || 1) * GAP_Y + 80)) }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
      >
        {fullscreen && <Controls />}
        <Background gap={20} size={1} color="var(--border)" />
      </ReactFlow>
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
