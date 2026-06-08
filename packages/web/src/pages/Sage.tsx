import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BrainCircuit, Search, Star, X, Tag } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';

interface Sage {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author_email?: string;
  favorited: boolean;
  keywords: string[];
  created_at: string;
}

type FilterType = 'all' | 'favorited';

export default function SagePage() {
  const { t } = useTranslation();
  const [sages, setSages] = useState<Sage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter === 'favorited') params.favorited = 'true';
    if (search.trim()) params.keyword = search.trim();

    api.sages(params)
      .then((r) => setSages(r.sages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(load, [load]);

  const handleToggleInstall = async (sage: Sage) => {
    setToggling((s) => new Set(s).add(sage.id));
    try {
      if (sage.favorited) {
        await api.unfavoriteSage(sage.id);
        toast({ title: t('sage.unfavorite_success'), variant: 'success' });
      } else {
        await api.favoriteSage(sage.id);
        toast({ title: t('sage.favorite_success'), variant: 'success' });
      }
      load();
    } catch (err: any) {
      toast({ title: err.message, variant: 'error' });
    }
    setToggling((s) => { const n = new Set(s); n.delete(sage.id); return n; });
  };

  const favoritedCount = sages.filter((s) => s.favorited).length;

  return (
    <>
      <div className="sticky top-0 z-10 bg-background flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('sage.title')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('sage.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 shrink-0">
            <FilterTab label={t('sage.all')} active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterTab label={t('sage.favorited')} active={filter === 'favorited'} count={favoritedCount} onClick={() => setFilter('favorited')} />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('sage.search_placeholder')}
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
          {loading && sages.length === 0 && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && sages.length === 0 && (
            <div className="p-12 text-center fade-in">
              <BrainCircuit className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-lg font-semibold text-muted-foreground">
                {search ? t('sage.no_results') : t('sage.empty')}
              </p>
              {!search && (
                <p className="mt-1 text-sm text-muted-foreground">{t('sage.empty_hint')}</p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sages.map((s) => (
              <Card key={s.id} className="transition-all duration-200 hover:bg-accent/50 hover:border-brand/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {s.favorited && (
                          <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                        )}
                        <p className="font-semibold text-foreground truncate">
                          {s.name}
                          {s.version && <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">v{s.version}</span>}
                        </p>
                      </div>
                      {s.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                      )}
                    </div>
                  </div>

                  {s.keywords.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <Tag className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      {s.keywords.slice(0, 5).map((k) => (
                        <Badge key={k} variant="brand" className="text-[10px] px-1.5 py-0">{k}</Badge>
                      ))}
                      {s.keywords.length > 5 && (
                        <span className="text-[10px] text-muted-foreground">+{s.keywords.length - 5}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    {s.author_email && (
                      <span className="truncate">{s.author_email.split('@')[0]}</span>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button
                      variant={s.favorited ? 'outline' : 'default'}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={toggling.has(s.id)}
                      onClick={() => handleToggleInstall(s)}
                    >
                      {toggling.has(s.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : s.favorited ? (
                        <><X className="h-3 w-3" /> {t('sage.unfavorite')}</>
                      ) : (
                        <><Star className="h-3 w-3" /> {t('sage.favorite')}</>
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
