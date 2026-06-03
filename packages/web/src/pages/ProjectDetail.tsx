import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, GitBranch, MessageSquare, Users, Trash2 } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface ThreadItem {
  thread_id: string;
  subject: string;
  message_count: number;
  participant_count: number;
  last_activity: string;
  has_unread: boolean;
  project?: string;
}

export default function ProjectDetail() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { name } = useParams<{ name: string }>();
  const projectName = decodeURIComponent(name || '');
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectName) return;
    api.listThreads({ project: projectName }).then((r) => setThreads(r.threads || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [projectName]);

  const handleDeleteProject = async () => {
    const ok = await confirm({
      title: t('project.delete_title'),
      description: `${projectName} — ${threads.length} ${t('project.threads')}`,
      confirmText: t('project.delete_unlink'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      // Need project id — fetch it
      const res = await api.projects();
      const proj = (res.projects || []).find((p: any) => p.name === projectName);
      if (!proj) throw new Error('Project not found');
      await api.deleteProject(proj.id, 'unlink');
      toast({ title: t('project.deleted'), variant: 'success' });
      window.location.href = '/projects';
    } catch (err: any) {
      toast({ title: err.message, variant: 'error' });
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background flex items-center gap-3 border-b border-border px-4 md:px-10 py-4 md:py-5">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects"><ArrowLeft className="h-4 w-4" /> {t('project.title')}</Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">{projectName}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {threads.length} {t('project.threads')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDeleteProject} className="text-destructive hover:text-destructive border-destructive/30">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="px-4 md:px-10 py-4 md:py-6">
        {loading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div className="p-12 text-center fade-in">
            <GitBranch className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-semibold text-muted-foreground">{t('project.no_threads')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('project.no_threads_hint')}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {threads.map((thread) => (
            <Link key={thread.thread_id} to={`/threads/${thread.thread_id}`}>
              <div className={cn(
                'rounded-xl border border-border p-4 transition-all duration-200 hover:bg-accent/50 hover:border-brand/30',
                thread.has_unread && 'border-brand/20 bg-accent/10',
              )}>
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm truncate', thread.has_unread ? 'font-semibold' : 'text-foreground')}>
                    {thread.subject}
                  </p>
                  {thread.has_unread && <span className="h-2 w-2 rounded-full bg-brand shrink-0 mt-1.5" />}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.message_count}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{thread.participant_count}</span>
                  <span className="ml-auto">{formatDate(thread.last_activity)}</span>
                </div>
              </div>
            </Link>
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
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}
