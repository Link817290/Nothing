import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Wand2, Check, X, ChevronDown, ChevronUp,
  FolderPlus, FolderOpen, Loader2, Trash2, Pencil,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface ThreadInfo {
  thread_id: string;
  subject: string;
  from: string;
  message_count: number;
}

interface Suggestion {
  project_name: string;
  description: string;
  reason: string;
  thread_ids: string[];
  threads: ThreadInfo[];
  is_new_project: boolean;
  accepted: boolean;
  edited_name?: string;
}

interface Props {
  onClose: () => void;
  onApplied: () => void;
}

export function OrganizePanel({ onClose, onApplied }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [thinking, setThinking] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [unorganizedCount, setUnorganizedCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = async () => {
    setLoading(true);
    setStarted(true);
    setDone(false);
    setSuggestions([]);
    setThinking('');

    const token = useAuthStore.getState().token;
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/agent/organize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { setDone(true); continue; }

          try {
            const event = JSON.parse(data);
            switch (event.type) {
              case 'meta':
                setUnorganizedCount(event.unorganized_count);
                break;
              case 'thinking':
                setThinking(prev => prev + event.text);
                break;
              case 'suggestion':
                setSuggestions(prev => {
                  // Deduplicate by project_name + thread_ids
                  const key = event.data.project_name + event.data.thread_ids.join(',');
                  if (prev.some(s => s.project_name + s.thread_ids.join(',') === key)) return prev;
                  return [...prev, { ...event.data, accepted: true }];
                });
                break;
              case 'done':
                setDone(true);
                break;
              case 'error':
                toast({ title: event.message, variant: 'error' });
                break;
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({ title: err.message, variant: 'error' });
      }
    }

    setLoading(false);
    setDone(true);
  };

  const cancel = () => {
    abortRef.current?.abort();
    setLoading(false);
    setDone(true);
  };

  const toggleAccept = (idx: number) => {
    setSuggestions(prev =>
      prev.map((s, i) => i === idx ? { ...s, accepted: !s.accepted } : s)
    );
  };

  const removeThread = (sugIdx: number, threadId: string) => {
    setSuggestions(prev =>
      prev.map((s, i) => {
        if (i !== sugIdx) return s;
        const filtered = s.thread_ids.filter(id => id !== threadId);
        const filteredThreads = s.threads.filter(t => t.thread_id !== threadId);
        return { ...s, thread_ids: filtered, threads: filteredThreads, accepted: filtered.length > 0 ? s.accepted : false };
      }).filter(s => s.thread_ids.length > 0)
    );
  };

  const renameSuggestion = (idx: number, name: string) => {
    setSuggestions(prev =>
      prev.map((s, i) => i === idx ? { ...s, edited_name: name } : s)
    );
  };

  const apply = async () => {
    const accepted = suggestions.filter(s => s.accepted && s.thread_ids.length > 0);
    if (accepted.length === 0) return;

    setApplying(true);
    try {
      const actions = accepted.map(s => ({
        project_name: s.edited_name || s.project_name,
        description: s.description,
        thread_ids: s.thread_ids,
        is_new_project: s.is_new_project,
      }));
      const result = await api.applyOrganize(actions);
      toast({
        title: `${result.projects_created} projects created, ${result.threads_assigned} threads assigned`,
        variant: 'success',
      });
      onApplied();
      onClose();
    } catch (err: any) {
      toast({ title: err.message, variant: 'error' });
    }
    setApplying(false);
  };

  const acceptedCount = suggestions.filter(s => s.accepted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-bold tracking-tight">Organize Threads</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Not started */}
          {!started && (
            <div className="text-center py-12">
              <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-1">
                AI will analyze your unorganized threads and suggest project groupings.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                You'll review every suggestion before anything changes.
              </p>
              <Button onClick={analyze} className="rounded-full px-6">
                <Wand2 className="h-4 w-4 mr-2" /> Analyze Threads
              </Button>
            </div>
          )}

          {/* Thinking indicator */}
          {loading && suggestions.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing {unorganizedCount} threads...</span>
              </div>
              {thinking && (
                <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground font-mono max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {thinking.slice(-300)}
                </div>
              )}
            </div>
          )}

          {/* Loading with suggestions already arriving */}
          {loading && suggestions.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Finding more groups...
              </p>
              <Button variant="ghost" size="sm" onClick={cancel} className="text-xs">
                Stop
              </Button>
            </div>
          )}

          {/* Done, no results */}
          {done && suggestions.length === 0 && started && (
            <div className="text-center py-12">
              <Check className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="font-semibold">All organized!</p>
              <p className="text-sm text-muted-foreground mt-1">No unorganized threads found.</p>
            </div>
          )}

          {/* Done info */}
          {done && suggestions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {suggestions.length} groups suggested from {unorganizedCount} threads. Review and confirm:
            </p>
          )}

          {/* Suggestion cards */}
          {suggestions.map((sug, idx) => (
            <Card
              key={sug.project_name + idx}
              className={cn(
                'transition-all border animate-in fade-in slide-in-from-bottom-2 duration-300',
                sug.accepted ? 'border-brand/30 bg-brand/[0.02]' : 'border-border opacity-60'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleAccept(idx)}
                    className={cn(
                      'mt-0.5 h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                      sug.accepted
                        ? 'bg-brand border-brand text-white'
                        : 'border-border hover:border-muted-foreground'
                    )}
                  >
                    {sug.accepted && <Check className="h-3 w-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingIdx === idx ? (
                        <Input
                          value={sug.edited_name ?? sug.project_name}
                          onChange={e => renameSuggestion(idx, e.target.value)}
                          onBlur={() => setEditingIdx(null)}
                          onKeyDown={e => e.key === 'Enter' && setEditingIdx(null)}
                          className="h-7 text-sm font-semibold w-48"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="font-semibold text-sm">
                            {sug.edited_name || sug.project_name}
                          </span>
                          <button
                            onClick={() => setEditingIdx(idx)}
                            className="p-0.5 rounded hover:bg-secondary"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </>
                      )}
                      <Badge variant={sug.is_new_project ? 'default' : 'outline'} className="text-[10px]">
                        {sug.is_new_project ? (
                          <><FolderPlus className="h-3 w-3 mr-1" />New</>
                        ) : (
                          <><FolderOpen className="h-3 w-3 mr-1" />Existing</>
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {sug.thread_ids.length} threads
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{sug.reason}</p>
                  </div>

                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className="p-1 rounded hover:bg-secondary flex-shrink-0"
                  >
                    {expandedIdx === idx
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                </div>

                {expandedIdx === idx && (
                  <div className="mt-3 ml-8 space-y-1.5">
                    {sug.threads.map(thread => (
                      <div
                        key={thread.thread_id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-secondary/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate font-medium text-foreground">{thread.subject}</span>
                          <span className="text-muted-foreground shrink-0">{thread.from}</span>
                          <span className="text-muted-foreground/60 shrink-0">{thread.message_count} msgs</span>
                        </div>
                        <button
                          onClick={() => removeThread(idx, thread.thread_id)}
                          className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive flex-shrink-0 ml-2"
                          title="Remove from this group"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        {suggestions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {acceptedCount} of {suggestions.length} accepted
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="rounded-full">
                Cancel
              </Button>
              <Button
                onClick={apply}
                disabled={applying || acceptedCount === 0}
                className="rounded-full"
              >
                {applying ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Applying...</>
                ) : (
                  <>Apply {acceptedCount} groups</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
