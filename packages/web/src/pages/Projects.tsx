import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, FolderOpen, GitBranch, Mail, MessageSquare } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  thread_count: number;
  message_count: number;
  unread: number;
}

export default function Projects() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.projects().then((r) => setProjects(r.projects || []))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createProject(newName.trim(), newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      toast({ title: t('project.created'), variant: 'success' });
      load();
    } catch (err: any) {
      toast({ title: err.message, variant: 'error' });
    }
    setCreating(false);
  };

  const handleDelete = async (project: Project) => {
    const ok = await confirm({
      title: t('project.delete_title'),
      description: `${project.name} — ${project.thread_count} ${t('project.threads')}, ${project.message_count} ${t('project.messages')}`,
      confirmText: t('project.delete_unlink'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api.deleteProject(project.id, 'unlink');
      toast({ title: t('project.deleted'), variant: 'success' });
      load();
    } catch (err: any) {
      toast({ title: err.message, variant: 'error' });
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between border-b border-border px-4 md:px-10 py-4 md:py-5">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('project.title')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('project.subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3.5 w-3.5" /> {t('project.create')}
        </Button>
      </div>

      <div className="px-4 md:px-10 py-4 md:py-6">
        <div className="space-y-4 fade-in">
          {showCreate && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('project.name_placeholder')}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t('project.description_placeholder')}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                    {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('common.create')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && projects.length === 0 && !showCreate && (
            <div className="p-12 text-center fade-in">
              <FolderOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-lg font-semibold text-muted-foreground">{t('project.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('project.empty_hint')}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="group relative">
                <Link to={`/projects/${encodeURIComponent(p.name)}`}>
                  <Card className="transition-all duration-200 hover:bg-accent/50 hover:border-brand/30">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{p.name}</p>
                          {p.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                          )}
                        </div>
                        {p.unread > 0 && <Badge variant="brand" className="shrink-0">{p.unread}</Badge>}
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{p.thread_count} {t('project.threads')}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.message_count} {t('project.messages')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(p); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
