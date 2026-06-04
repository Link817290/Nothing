import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PackageOpen, Search, Download, X, Tag } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';

interface Pack {
  id: string;
  capsule_id: string;
  name: string;
  version?: string;
  kind: string;
  description?: string;
  author_email?: string;
  installable: boolean;
  runnable: boolean;
  installed: boolean;
  keywords: string[];
  source_message_id?: string;
  created_at: string;
}

type FilterType = 'all' | 'installed';

export default function ExperiencePacks() {
  const { t } = useTranslation();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter === 'installed') params.installed = 'true';
    if (search.trim()) params.keyword = search.trim();

    api.experiencePacks(params)
      .then((r) => setPacks(r.packs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(load, [load]);

  const handleToggleInstall = async (pack: Pack) => {
    setToggling((s) => new Set(s).add(pack.id));
    try {
      if (pack.installed) {
        await api.uninstallExperiencePack(pack.id);
        toast({ title: t('packs.uninstall_success'), variant: 'success' });
      } else {
        await api.installExperiencePack(pack.id);
        toast({ title: t('packs.install_success'), variant: 'success' });
      }
      load();
    } catch (err: any) {
      toast({ title: err.message, variant: 'error' });
    }
    setToggling((s) => { const n = new Set(s); n.delete(pack.id); return n; });
  };

  const installedCount = packs.filter((p) => p.installed).length;

  return (
    <>
      <div className="sticky top-0 z-10 bg-background flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('packs.title')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('packs.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 shrink-0">
            <FilterTab label={t('packs.all')} active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterTab label={t('packs.installed')} active={filter === 'installed'} count={installedCount} onClick={() => setFilter('installed')} />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('packs.search_placeholder')}
              className="pl-8 h-8 w-40 md:w-52 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-10 py-4 md:py-6">
        <div className="space-y-4 fade-in">
          {loading && packs.length === 0 && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && packs.length === 0 && (
            <div className="p-12 text-center fade-in">
              <PackageOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-lg font-semibold text-muted-foreground">
                {search ? t('packs.no_results') : t('packs.empty')}
              </p>
              {!search && (
                <p className="mt-1 text-sm text-muted-foreground">{t('packs.empty_hint')}</p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {packs.map((p) => (
              <Card key={p.id} className="transition-all duration-200 hover:bg-accent/50 hover:border-brand/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {p.installed && (
                          <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                        )}
                        <p className="font-semibold text-foreground truncate">
                          {p.name}
                          {p.version && <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">v{p.version}</span>}
                        </p>
                      </div>
                      {p.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  {p.keywords.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <Tag className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      {p.keywords.slice(0, 5).map((k) => (
                        <Badge key={k} variant="brand" className="text-[10px] px-1.5 py-0">{k}</Badge>
                      ))}
                      {p.keywords.length > 5 && (
                        <span className="text-[10px] text-muted-foreground">+{p.keywords.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Metadata row */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    {p.author_email && (
                      <span className="truncate">{p.author_email.split('@')[0]}</span>
                    )}
                    <span className="font-mono text-muted-foreground/60 truncate">{p.capsule_id}</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant={p.installed ? 'outline' : 'default'}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={toggling.has(p.id)}
                      onClick={() => handleToggleInstall(p)}
                    >
                      {toggling.has(p.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : p.installed ? (
                        <><X className="h-3 w-3" /> {t('packs.uninstall')}</>
                      ) : (
                        <><Download className="h-3 w-3" /> {t('packs.install')}</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function FilterTab({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm rounded-lg transition-all duration-200',
        active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
    >
      {label}
      {count != null && count > 0 && (
        <span className="ml-1.5 font-mono text-xs text-brand">{count}</span>
      )}
    </button>
  );
}
