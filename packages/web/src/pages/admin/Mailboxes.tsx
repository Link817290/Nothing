import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Mail, Tag, HardDrive, ChevronDown } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

export default function AdminMailboxes() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [expandedMb, setExpandedMb] = useState<string | null>(null);
  const [newAlias, setNewAlias] = useState('');

  const load = () => {
    api.adminMailboxes().then((r) => setMailboxes(r.mailboxes || []))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async () => {
    if (!username || !email || !password) return;
    setAdding(true);
    setAddError('');
    try {
      await api.adminCreateMailbox({ username, password, email });
      setUsername(''); setEmail(''); setPassword('');
      setShowAdd(false);
      load();
      toast({ title: t('admin.mailbox_created'), variant: 'success' });
    } catch (err: any) {
      setAddError(err.message);
    }
    setAdding(false);
  };

  const handleDelete = async (name: string) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: t('admin.delete_mailbox_confirm', { name }),
      confirmText: t('common.delete'),
      variant: 'destructive',
    });
    if (!ok) return;
    await api.adminDeleteMailbox(name);
    toast({ title: t('admin.mailbox_deleted'), variant: 'success' });
    load();
  };

  const handleAddAlias = async (mbName: string) => {
    if (!newAlias.trim()) return;
    try {
      await api.adminAddAlias(mbName, newAlias.trim());
      setNewAlias('');
      load();
      toast({ title: t('admin.alias_added'), variant: 'success' });
    } catch (err: any) {
      toast({ title: t('settings.test_failed'), description: err.message, variant: 'error' });
    }
  };

  const handleRemoveAlias = async (mbName: string, alias: string) => {
    await api.adminRemoveAlias(mbName, alias);
    load();
    toast({ title: t('admin.alias_removed'), variant: 'success' });
  };

  const [quotaInput, setQuotaInput] = useState('');
  const [quotaFor, setQuotaFor] = useState<string | null>(null);

  const handleSetQuota = async (mbName: string) => {
    if (!quotaInput) return;
    const mb = parseInt(quotaInput);
    if (isNaN(mb)) return;
    try {
      await api.adminSetQuota(mbName, mb);
      load();
      toast({ title: t('admin.quota_set', { mb: String(mb) }), variant: 'success' });
      setQuotaFor(null);
      setQuotaInput('');
    } catch (err: any) {
      toast({ title: t('settings.test_failed'), description: err.message, variant: 'error' });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 md:px-10 py-4 md:py-5">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('admin.mailboxes_title')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('admin.mailboxes_subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5" /> {t('admin.create_mailbox')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 md:py-6">
        <div className="space-y-4">
          {showAdd && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium">{t('admin.create_mailbox_hint')}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@yourdomain.com" />
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={adding}>
                    {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('common.create')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : mailboxes.length === 0 && !showAdd ? (
            <div className="p-12 text-center fade-in">
              <p className="text-lg font-semibold text-muted-foreground">{t('admin.no_mailboxes')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('admin.no_mailboxes_hint')}</p>
            </div>
          ) : (
            mailboxes.map((mb: any) => {
              const name = typeof mb === 'string' ? mb : mb.name || mb.id;
              const emails = mb.emails || [];
              const quota = mb.quota;
              const isExpanded = expandedMb === name;

              return (
                <Card key={name}>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            {emails.map((e: string) => (
                              <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                            ))}
                            {quota && (
                              <Badge variant="outline" className="text-xs">
                                <HardDrive className="h-3 w-3 mr-1" />
                                {Math.round(quota / 1024 / 1024)} MB
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setExpandedMb(isExpanded ? null : name)}>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {t('admin.manage')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(name)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t border-border pt-4 space-y-4">
                        {/* Aliases */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            <Tag className="h-3 w-3 inline mr-1" /> {t('admin.email_aliases')}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {emails.map((e: string, i: number) => (
                              <span key={e} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs">
                                {e}
                                {i > 0 && (
                                  <button onClick={() => handleRemoveAlias(name, e)} className="text-muted-foreground hover:text-destructive ml-1">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={newAlias}
                              onChange={(e) => setNewAlias(e.target.value)}
                              placeholder="alias@yourdomain.com"
                              className="flex-1"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddAlias(name)}
                            />
                            <Button variant="outline" size="sm" onClick={() => handleAddAlias(name)}>{t('admin.add_alias')}</Button>
                          </div>
                        </div>

                        {/* Quota */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            <HardDrive className="h-3 w-3 inline mr-1" /> {t('admin.storage_quota')}
                            {quota ? ` — ${Math.round(quota / 1024 / 1024)} MB` : ''}
                          </p>
                          {quotaFor === name ? (
                            <div className="flex gap-2">
                              <Input
                                value={quotaInput}
                                onChange={(e) => setQuotaInput(e.target.value.replace(/\D/g, ''))}
                                placeholder="MB (0 = unlimited)"
                                className="w-40"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSetQuota(name)}
                              />
                              <Button variant="outline" size="sm" onClick={() => handleSetQuota(name)}>Save</Button>
                              <Button variant="ghost" size="sm" onClick={() => { setQuotaFor(null); setQuotaInput(''); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => { setQuotaFor(name); setQuotaInput(quota ? String(Math.round(quota / 1024 / 1024)) : ''); }}>
                              {quota ? t('admin.change_quota') : t('admin.set_quota')}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
