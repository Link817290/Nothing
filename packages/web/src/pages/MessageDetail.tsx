import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageBody } from '@/components/email/MessageBody';
import { Loader2, ArrowLeft, Reply, Forward, Trash2, Eye, EyeOff, Paperclip, Download, Image, FileText, File, ChevronDown } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/authStore';

interface MessageData {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  content: string;
  project?: string;
  labels: string[];
  status: string;
  source: string;
  unread?: boolean;
  thread: { id: string; from: string; preview: string; date: string }[];
}

export default function MessageDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<MessageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [fwdTo, setFwdTo] = useState('');
  const [panel, setPanel] = useState<'reply' | 'forward' | null>(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [expandedAtt, setExpandedAtt] = useState<string | null>(null);
  const [threadView, setThreadView] = useState<'tree' | 'canvas'>('tree');

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getMessage(id).then((data) => {
      setMsg(data);
      if (data.unread) api.markRead(id, true).catch(() => {});
      // Load attachments + image previews
      api.getAttachments(id).then(r => {
        const atts = r.attachments || [];
        setAttachments(atts);
        // Load image previews
        const token = useAuthStore.getState().token;
        atts.filter((a: any) => /^image\//i.test(a.content_type)).forEach((a: any) => {
          fetch(`/api/attachments/${a.id}/download`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.ok ? res.blob() : null)
            .then(blob => { if (blob) setPreviewUrls(prev => ({ ...prev, [a.id]: URL.createObjectURL(blob) })) })
            .catch(() => {});
        });
      }).catch(() => {});
    }).catch(() => navigate('/inbox')).finally(() => setLoading(false));
  }, [id]);

  const handleReply = async () => {
    if (!replyText.trim() || !id) return;
    setSending(true);
    try {
      await api.reply(id, replyText);
      setReplyText('');
      setPanel(null);
      toast({ title: t('message.reply_sent'), variant: 'success' });
      api.getMessage(id).then(setMsg);
    } catch (err: any) {
      toast({ title: t('message.reply_fail'), description: err.message, variant: 'error' });
    }
    setSending(false);
  };

  const handleForward = async () => {
    if (!fwdTo.trim() || !id) return;
    setSending(true);
    try {
      await api.forward(id, fwdTo);
      setFwdTo('');
      setPanel(null);
      toast({ title: t('message.forwarded'), variant: 'success' });
    } catch (err: any) {
      toast({ title: t('message.forward_fail'), description: err.message, variant: 'error' });
    }
    setSending(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await api.deleteMessage(id);
    toast({ title: t('message.deleted'), variant: 'success' });
    navigate('/inbox');
  };

  const downloadAtt = async (att: any) => {
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`/api/attachments/${att.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download failed', variant: 'error' });
    }
  };

  const handleToggleRead = async () => {
    if (!id || !msg) return;
    await api.markRead(id, !!msg.unread);
    setMsg({ ...msg, unread: !msg.unread });
    toast({ title: msg.unread ? t('message.marked_read') : t('message.marked_unread'), variant: 'info' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!msg) return null;

  const isNmp = msg.source === 'nmp';

  return (
    <>
      {/* Top bar */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:gap-3 md:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/inbox"><ArrowLeft className="h-4 w-4" /> {t('nav.inbox')}</Link>
        </Button>
        <div className="flex items-center gap-2 overflow-x-auto sm:ml-auto">
          <Button size="sm" onClick={() => setPanel(panel === 'reply' ? null : 'reply')}>
            <Reply className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('message.reply')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPanel(panel === 'forward' ? null : 'forward')}>
            <Forward className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('message.forward')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleRead}>
            {msg.unread ? <><Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('message.mark_read')}</span></> : <><EyeOff className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('message.mark_unread')}</span></>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive border-destructive/30">
            <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('message.delete')}</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-10 md:py-6">
        <div className="fade-in">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isNmp ? (
              <Badge variant="nmp" className="text-xs">NMP</Badge>
            ) : (
              <span className="uppercase tracking-widest">Email</span>
            )}
            <span className="text-muted-foreground/40">/</span>
            <span className="font-mono">{new Date(msg.date).toLocaleString()}</span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl text-foreground">
            {msg.subject || t('common.no_subject')}
          </h1>

          {/* From / To */}
          <div className={cn(
            'mt-4 md:mt-6 flex flex-col gap-3 rounded-xl p-3 md:p-4 sm:flex-row sm:items-center sm:gap-4',
            isNmp ? 'bg-accent/30' : 'bg-accent/30',
          )}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar name={parseAddress(msg.from).name} isNmp={isNmp} />
              <div className="text-sm min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{parseAddress(msg.from).name}</span>
                  <span className="text-muted-foreground/40">&rarr;</span>
                  <span className="text-muted-foreground">{parseAddress(msg.to).name}</span>
                </div>
                <div className="text-xs text-muted-foreground/60 truncate">
                  {parseAddress(msg.from).email} &middot; {parseAddress(msg.to).email}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {msg.project && <Badge variant="outline">{msg.project}</Badge>}
              {msg.labels?.map((l) => (
                <Badge key={l} variant="secondary" className="text-xs uppercase tracking-wider">{l}</Badge>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="mt-8">
            <MessageBody content={msg.content} source={msg.source} />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <Paperclip className="h-3 w-3 inline mr-1" /> {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
              </p>
              {attachments.map((att: any) => {
                const isImage = /^image\//i.test(att.content_type)
                const isPdf = /pdf/i.test(att.content_type)
                const isExpanded = expandedAtt === att.id
                const IconComp = isImage ? Image : isPdf ? FileText : File

                return (
                  <div key={att.id} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors">
                      <IconComp className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{att.filename}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.size)}</span>
                      {isImage && previewUrls[att.id] && (
                        <button
                          onClick={() => setExpandedAtt(isExpanded ? null : att.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => downloadAtt(att)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isExpanded && previewUrls[att.id] && (
                      <div className="border-t border-border bg-muted/30 p-2 fade-in">
                        <img
                          src={previewUrls[att.id]}
                          alt={att.filename}
                          className="max-w-full max-h-[500px] object-contain mx-auto rounded"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Thread */}
          {msg.thread && msg.thread.length > 1 && (
            <div className="mt-10 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {t('message.thread')} &middot; {msg.thread.length}
                </p>
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                  <button
                    onClick={() => setThreadView('tree')}
                    className={cn('px-2.5 py-1 text-xs rounded-md transition-colors', threadView === 'tree' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >Tree</button>
                  <button
                    onClick={() => setThreadView('canvas')}
                    className={cn('px-2.5 py-1 text-xs rounded-md transition-colors', threadView === 'canvas' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >Canvas</button>
                </div>
              </div>

              {threadView === 'tree' ? (
                <div className="mt-3">
                  <ThreadTree items={msg.thread} currentId={msg.id} />
                </div>
              ) : (
                <div className="mt-3">
                  <ThreadCanvas items={msg.thread} currentId={msg.id} />
                </div>
              )}
            </div>
          )}

          {/* Reply panel */}
          {panel === 'reply' && (
            <div className="mt-8 border-t border-border pt-6 fade-in">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('message.reply')}</p>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('message.reply_placeholder')}
                className="mt-3 w-full rounded-xl border border-border bg-accent/30 p-4 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all duration-200 resize-none"
                rows={5}
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleReply} disabled={sending}>
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : t('message.send_reply')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>{t('common.cancel')}</Button>
              </div>
            </div>
          )}

          {/* Forward panel */}
          {panel === 'forward' && (
            <div className="mt-8 border-t border-border pt-6 fade-in">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('message.forward_to')}</p>
              <input
                value={fwdTo}
                onChange={(e) => setFwdTo(e.target.value)}
                placeholder="recipient@example.com"
                className="mt-3 w-full rounded-lg border border-border bg-accent/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all duration-200"
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleForward} disabled={sending}>
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : t('message.forward')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>{t('common.cancel')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Thread Components ──────────────────────────────────────────

interface ThreadItemData {
  id: string; from: string; preview: string; date: string; in_reply_to?: string | null;
}

function ThreadItem({ item, currentId, depth = 0 }: { item: ThreadItemData; currentId: string; depth?: number }) {
  return (
    <Link to={`/messages/${item.id}`} className="block">
      <div className={cn(
        'flex items-baseline gap-3 border-b border-border py-2.5 text-sm transition-all duration-200 hover:bg-accent/50 rounded-lg px-2 -mx-2',
      )} style={{ paddingLeft: `${depth * 20 + 8}px` }}>
        <span className={cn('h-2 w-2 shrink-0 rounded-full', item.id === currentId ? 'bg-foreground' : 'bg-border')} />
        {depth > 0 && <span className="text-muted-foreground/30 shrink-0">└</span>}
        <span className={cn('w-24 shrink-0 truncate', item.id === currentId ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {item.from.split('@')[0]}
        </span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground/70">{item.preview}</span>
        <span className="shrink-0 text-xs text-muted-foreground/50">{formatDate(item.date)}</span>
      </div>
    </Link>
  )
}

function ThreadTree({ items, currentId }: { items: ThreadItemData[]; currentId: string }) {
  // Build tree from flat list using in_reply_to
  const childrenMap = new Map<string | null, ThreadItemData[]>()
  const idSet = new Set(items.map(i => i.id))

  for (const item of items) {
    const parentId = item.in_reply_to && idSet.has(item.in_reply_to) ? item.in_reply_to : null
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, [])
    childrenMap.get(parentId)!.push(item)
  }

  function renderNode(parentId: string | null, depth: number): React.ReactNode {
    const children = childrenMap.get(parentId) || []
    return children.map(item => (
      <div key={item.id}>
        <ThreadItem item={item} currentId={currentId} depth={depth} />
        {renderNode(item.id, depth + 1)}
      </div>
    ))
  }

  return <div>{renderNode(null, 0)}</div>
}


function ThreadCanvas({ items, currentId }: { items: ThreadItemData[]; currentId: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [drag, setDrag] = React.useState({ dragging: false, startX: 0, startY: 0, scrollX: 0, scrollY: 0 })

  // Build tree structure
  const childrenMap = new Map<string | null, ThreadItemData[]>()
  const idSet = new Set(items.map(i => i.id))
  for (const item of items) {
    const parentId = item.in_reply_to && idSet.has(item.in_reply_to) ? item.in_reply_to : null
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, [])
    childrenMap.get(parentId)!.push(item)
  }

  // Layout: assign x (depth) and y (row) to each node
  const NODE_W = 240, NODE_H = 64, GAP_X = 56, GAP_Y = 24
  const positions = new Map<string, { x: number; y: number }>()
  let nextY = 0

  function layout(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) || []
    for (const child of children) {
      positions.set(child.id, { x: depth * (NODE_W + GAP_X), y: nextY * (NODE_H + GAP_Y) })
      nextY++
      layout(child.id, depth + 1)
    }
  }
  layout(null, 0)

  const canvasW = Math.max(800, (positions.size > 0 ? Math.max(...[...positions.values()].map(p => p.x)) : 0) + NODE_W + 80)
  const canvasH = Math.max(300, nextY * (NODE_H + GAP_Y) + 60)

  const navigate = useNavigate()

  // Drag to pan
  const onMouseDown = (e: React.MouseEvent) => {
    const el = containerRef.current
    if (!el) return
    setDrag({ dragging: true, startX: e.clientX, startY: e.clientY, scrollX: el.scrollLeft, scrollY: el.scrollTop })
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.dragging || !containerRef.current) return
    containerRef.current.scrollLeft = drag.scrollX - (e.clientX - drag.startX)
    containerRef.current.scrollTop = drag.scrollY - (e.clientY - drag.startY)
  }
  const onMouseUp = () => setDrag(d => ({ ...d, dragging: false }))

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg border border-border bg-muted/20 cursor-grab active:cursor-grabbing"
      style={{ maxHeight: '500px' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <svg width={canvasW} height={canvasH} className="select-none" style={{ fontFamily: 'var(--font-sans)' }}>
        {/* Lines */}
        {items.map(item => {
          const pos = positions.get(item.id)
          const parentId = item.in_reply_to && idSet.has(item.in_reply_to) ? item.in_reply_to : null
          const parentPos = parentId ? positions.get(parentId) : null
          if (!pos || !parentPos) return null
          return (
            <path
              key={`line-${item.id}`}
              d={`M${parentPos.x + NODE_W},${parentPos.y + NODE_H / 2} C${parentPos.x + NODE_W + GAP_X / 2},${parentPos.y + NODE_H / 2} ${pos.x - GAP_X / 2},${pos.y + NODE_H / 2} ${pos.x},${pos.y + NODE_H / 2}`}
              fill="none"
              stroke="var(--border)"
              strokeWidth="1.5"
            />
          )
        })}

        {/* Nodes */}
        {items.map(item => {
          const pos = positions.get(item.id)
          if (!pos) return null
          const isCurrent = item.id === currentId
          return (
            <g
              key={item.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => navigate(`/messages/${item.id}`)}
              className="cursor-pointer"
            >
              <rect
                width={NODE_W} height={NODE_H} rx="8"
                fill={isCurrent ? 'var(--accent)' : 'var(--card)'}
                stroke={isCurrent ? 'var(--brand)' : 'var(--border)'}
                strokeWidth={isCurrent ? 2 : 1}
              />
              <text x="12" y="26" fontSize="14" fontWeight={isCurrent ? 600 : 400} fill="var(--foreground)">
                {item.from.split('@')[0]}
              </text>
              <text x="12" y="46" fontSize="13" fill="var(--muted-foreground)">
                {item.preview.slice(0, 30)}{item.preview.length > 30 ? '…' : ''}
              </text>
              <text x={NODE_W - 12} y="26" fontSize="12" fill="var(--muted-foreground)" textAnchor="end">
                {formatDate(item.date)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Parse "Display Name" <email@host> into { name, email } */
function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() || raw };
  }
  // Fallback: just an email
  return { name: raw.split('@')[0], email: raw };
}

function Avatar({ name, isNmp }: { name: string; isNmp?: boolean }) {
  const clean = name.replace(/['"<>]/g, '').trim();
  const initials = clean.split(/[\s-]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span className={cn(
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
      isNmp
        ? 'bg-accent text-foreground border border-border'
        : 'bg-accent text-foreground border border-border',
    )}>
      {initials}
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
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
