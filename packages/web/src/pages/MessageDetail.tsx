import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageBody } from '@/components/email/MessageBody';
import { Loader2, ArrowLeft, Reply, Forward, Trash2, Eye, EyeOff, Paperclip } from 'lucide-react';
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getMessage(id).then((data) => {
      setMsg(data);
      if (data.unread) api.markRead(id, true).catch(() => {});
      // Load attachments
      api.getAttachments(id).then(r => setAttachments(r.attachments || [])).catch(() => {});
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
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/inbox"><ArrowLeft className="h-4 w-4" /> {t('nav.inbox')}</Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => setPanel(panel === 'reply' ? null : 'reply')}>
            <Reply className="h-3.5 w-3.5" /> {t('message.reply')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPanel(panel === 'forward' ? null : 'forward')}>
            <Forward className="h-3.5 w-3.5" /> {t('message.forward')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleRead}>
            {msg.unread ? <><Eye className="h-3.5 w-3.5" /> {t('message.mark_read')}</> : <><EyeOff className="h-3.5 w-3.5" /> {t('message.mark_unread')}</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive border-destructive/30">
            <Trash2 className="h-3.5 w-3.5" /> {t('message.delete')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-10 py-6">
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
            'mt-6 flex items-center gap-4 rounded-xl p-4',
            isNmp ? 'bg-accent/30' : 'bg-accent/30',
          )}>
            <Avatar name={parseAddress(msg.from).name} isNmp={isNmp} />
            <div className="text-sm min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{parseAddress(msg.from).name}</span>
                <span className="text-muted-foreground/40">&rarr;</span>
                <span className="text-muted-foreground">{parseAddress(msg.to).name}</span>
              </div>
              <div className="text-xs text-muted-foreground/60 truncate">
                {parseAddress(msg.from).email} &middot; {parseAddress(msg.to).email}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
            <div className="mt-6 flex flex-wrap gap-2">
              {attachments.map((att: any) => (
                <button
                  key={att.id}
                  onClick={async () => {
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
                  }}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
                >
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">{att.filename}</span>
                  <span className="text-xs text-muted-foreground">{formatSize(att.size)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread */}
          {msg.thread && msg.thread.length > 1 && (
            <div className="mt-10 border-t border-border pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {t('message.thread')} &middot; {msg.thread.length}
              </p>
              <div className="mt-3 space-y-0">
                {msg.thread.map((t) => (
                  <Link to={`/messages/${t.id}`} key={t.id} className="block">
                    <div className={cn(
                      'flex items-baseline gap-4 border-b border-border py-3 text-sm transition-all duration-200 hover:bg-accent/50 rounded-lg px-2 -mx-2',
                    )}>
                      <span className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        t.id === msg.id ? 'bg-foreground' : 'bg-border',
                      )} />
                      <span className={cn('w-28 shrink-0 truncate', t.id === msg.id ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {t.from.split('@')[0]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground/70">{t.preview}</span>
                      <span className="shrink-0 text-xs text-muted-foreground/50">{formatDate(t.date)}</span>
                    </div>
                  </Link>
                ))}
              </div>
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
