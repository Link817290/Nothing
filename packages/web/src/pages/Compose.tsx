import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X, Send, ChevronDown } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';

export default function Compose() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [to, setTo] = useState(params.get('to') || '');
  const [subject, setSubject] = useState(params.get('subject') || '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; email: string }[]>([]);
  const [accountId, setAccountId] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [project, setProject] = useState('');
  const [labels, setLabels] = useState('');
  const [priority, setPriority] = useState('normal');

  useEffect(() => {
    api.listAccounts().then((r) => {
      const accs = r.accounts || [];
      setAccounts(accs);
      if (accs.length > 0) setAccountId(accs[0].id);
    }).catch(() => {});
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    try {
      await api.send({
        to: to.trim(),
        text: body,
        subject: subject || undefined,
        account_id: accountId || undefined,
        project: project || undefined,
        labels: labels ? labels.split(',').map((l) => l.trim()).filter(Boolean) : undefined,
        priority: priority !== 'normal' ? priority : undefined,
      });
      toast({ title: t('compose.sent_success'), variant: 'success' });
      navigate('/sent');
    } catch (err: any) {
      toast({ title: t('compose.sent_fail'), description: err.message, variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const noAccounts = accounts.length === 0;

  return (
    <div>
      <div className="px-4 py-6 md:px-10 md:py-8 fade-in">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('compose.title')}</h1>
            {accounts.length > 1 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sending from {accounts.find(a => a.id === accountId)?.email || '—'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <X className="h-4 w-4" /> {t('compose.cancel')}
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending || !to.trim() || !body.trim() || noAccounts}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> {t('compose.send')}</>}
            </Button>
          </div>
        </div>

        {/* No accounts warning */}
        {noAccounts && (
          <Card className="mb-6 border-border bg-accent">
            <CardContent className="p-4 text-sm">
              {t('compose.no_account_hint').split('<link>').map((part, i) => {
                if (i === 0) return part;
                const [linkText, rest] = part.split('</link>');
                return <span key={i}><button onClick={() => navigate('/settings')} className="font-semibold text-brand underline">{linkText}</button>{rest}</span>;
              })}
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardContent className="p-0">
            <form onSubmit={handleSend}>
              {/* To */}
              <div className="flex items-center border-b border-border px-4">
                <label className="w-14 shrink-0 text-xs text-muted-foreground">{t('compose.to')}</label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                  className="flex-1 border-0 bg-transparent py-3 text-sm focus:outline-none placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Subject */}
              <div className="flex items-center border-b border-border px-4">
                <label className="w-14 shrink-0 text-xs text-muted-foreground">{t('compose.subject')}</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="flex-1 border-0 bg-transparent py-3 text-sm font-medium focus:outline-none placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Account selector (if multiple) */}
              {accounts.length > 1 && (
                <div className="flex items-center border-b border-border px-4">
                  <label className="w-14 shrink-0 text-xs text-muted-foreground">{t('compose.from')}</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="flex-1 border-0 bg-transparent py-3 text-sm focus:outline-none"
                  >
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
                  </select>
                </div>
              )}

              {/* Optional fields toggle */}
              <div className="border-b border-border px-4 py-2">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                  {t('compose.options')}
                </button>
                {showOptions && (
                  <div className="mt-3 mb-1 flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">{t('compose.project')}</label>
                      <input
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        placeholder="e.g. my-project"
                        className="w-32 rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">{t('compose.labels')}</label>
                      <input
                        value={labels}
                        onChange={(e) => setLabels(e.target.value)}
                        placeholder="tag1, tag2"
                        className="w-32 rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">{t('compose.priority')}</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('compose.body_placeholder')}
                required
                className="w-full resize-none border-0 bg-transparent px-4 py-4 text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/40"
                rows={16}
              />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
