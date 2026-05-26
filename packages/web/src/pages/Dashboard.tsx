import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2, Inbox, Send, Mail, AlertTriangle,
  PenSquare, ArrowRight, Plus, Zap, FolderOpen,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface ReportData {
  period: { start: string; end: string; label: string };
  summary: { sent: number; received: number; replied: number; failed: number };
  projects: { name: string; messages: number; threads: number }[];
  needs_reply: { id: string; from: string; subject: string; date: string; project?: string }[];
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [report, setReport] = useState<ReportData | null>(null);
  const [unread, setUnread] = useState(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    Promise.all([
      api.reports({ period: 'week' }),
      api.inbox({ limit: '1' }),
      api.listAccounts(),
    ]).then(([r, inbox, accs]) => {
      setReport(r);
      setUnread(inbox.total_unread || 0);
      setAccounts(accs.accounts || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summary = report?.summary || { sent: 0, received: 0, replied: 0, failed: 0 };
  const hasNoAccounts = accounts.length === 0;
  const hasNoMessages = summary.sent === 0 && summary.received === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-10 py-8 space-y-8 fade-in">

        {/* Welcome */}
        <div>
          <h1 className="text-4xl font-bold tracking-tighter leading-tight">
            {user?.name ? t('dashboard.welcome', { name: user.name }) : t('dashboard.welcome_new')}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
            {hasNoAccounts
              ? t('dashboard.connect_hint')
              : hasNoMessages
                ? t('dashboard.empty_hint')
                : `${report?.period?.label || 'This week'} — ${t('dashboard.unread', { count: unread })}`
            }
          </p>
        </div>

        {/* Onboarding — only if no accounts */}
        {hasNoAccounts && (
          <Card className="border-brand/20 bg-brand/5">
            <CardContent className="flex items-center gap-5 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                <Zap className="h-6 w-6 text-brand" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold">{t('dashboard.get_started')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('dashboard.get_started_desc')}
                </p>
              </div>
              <Button asChild>
                <Link to="/settings"><Plus className="h-4 w-4" /> {t('dashboard.add_account')}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link to="/compose"><PenSquare className="h-4 w-4" /> {t('dashboard.new_message')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inbox">{t('nav.inbox')} {unread > 0 && `(${unread})`} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard icon={<Inbox className="h-4 w-4" />} label={t('stat.unread')} value={unread} highlight={unread > 0} />
          <StatCard icon={<Send className="h-4 w-4" />} label={t('stat.sent')} value={summary.sent} />
          <StatCard icon={<Mail className="h-4 w-4" />} label={t('stat.received')} value={summary.received} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label={t('stat.failed')} value={summary.failed} warn={summary.failed > 0} />
        </div>

        {/* Needs Reply */}
        {report?.needs_reply && report.needs_reply.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dashboard.needs_reply')}</h2>
            <div className="space-y-1">
              {report.needs_reply.slice(0, 5).map((m) => (
                <Link key={m.id} to={`/messages/${m.id}`} className="block">
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-accent">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.subject || t('common.no_subject')}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.from}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {report?.projects && report.projects.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dashboard.active_projects')}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {report.projects.map((p) => (
                <Link key={p.name} to={`/inbox?project=${p.name}`}>
                  <Card className="transition-colors hover:bg-accent/50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.messages} {t('dashboard.messages')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight, warn }: {
  icon: React.ReactNode; label: string; value: number; highlight?: boolean; warn?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <p className={`mt-3 text-4xl font-bold tabular-nums ${
          warn ? 'text-destructive' : highlight ? 'text-brand' : ''
        }`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  } catch { return ''; }
}
