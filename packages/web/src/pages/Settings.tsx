import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Loader2, Plus, RefreshCw, Trash2, LogOut, Sun, Moon, TestTube2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Account { id: string; provider: string; email: string; is_active: boolean; last_sync_at?: string }
interface ApiKey { id: string; name: string; permissions: string[]; created_at: string }

export default function Settings() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Add account
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState('gmail');
  const [accEmail, setAccEmail] = useState('');
  const [accPass, setAccPass] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState('');

  const pollTask = async (taskId: string): Promise<any> => {
    while (true) {
      await new Promise(r => setTimeout(r, 1000));
      const task = await api.getTask(taskId);
      if (task.status === 'running') {
        setSyncProgress(task.total > 0 ? `${task.progress}/${task.total}` : '...');
      }
      if (task.status === 'completed') return task.result;
      if (task.status === 'failed') throw new Error(task.error || 'Sync failed');
    }
  };

  // New key
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () => {
    api.listAccounts().then((r) => setAccounts(r.accounts || [])).catch(() => {});
    api.listKeys().then((r) => setKeys(r.keys || [])).catch(() => {});
  };
  useEffect(load, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const data: { name?: string; password?: string } = {};
      if (editName !== user?.name) data.name = editName;
      if (editPassword) data.password = editPassword;
      const res = await api.updateProfile(data);
      setUser({ ...user!, name: res.name });
      setEditPassword('');
      toast({ title: t('settings.saved'), variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to update profile', description: err.message, variant: 'error' });
    }
    setSaving(false);
  };

  const handleAddAccount = async () => {
    if (!accEmail || !accPass) return;
    setAdding(true);
    setAddError('');
    try {
      await api.addAccount({ provider, email: accEmail, password: accPass });
      setShowAdd(false);
      setAccEmail('');
      setAccPass('');
      load();
      toast({ title: 'Account added', variant: 'success' });
    } catch (err: any) {
      setAddError(err.message);
    }
    setAdding(false);
  };

  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTestAccount = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.testAccount(id);
      const details = `SMTP: ${res.smtp ? '✓' : '✗'}  IMAP: ${res.imap ? '✓' : '✗'}`;
      toast({ title: t('settings.test_passed'), description: details, variant: 'success' });
    } catch (err: any) {
      toast({ title: t('settings.test_failed'), description: err.message, variant: 'error' });
    }
    setTestingId(null);
  };

  const [newKeyName, setNewKeyName] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await api.createKey(newKeyName.trim());
      setNewKey(res.key);
      setNewKeyName('');
      setShowKeyForm(false);
      load();
    } catch {}
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="border-b border-border px-4 md:px-10 py-4 md:py-5">
        <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 md:py-6">
        <div className="space-y-8 fade-in">

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.profile')}</CardTitle>
              <CardDescription>{t('settings.profile_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('settings.email')}</p>
                  <p className="font-mono text-sm text-foreground">{user?.email}</p>
                </div>
                <Badge variant={user?.is_admin ? 'brand' : 'secondary'}>
                  {user?.is_admin ? t('settings.admin_role') : t('settings.user_role')}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('settings.display_name')}</p>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('settings.new_password')}</p>
                  <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder={t('settings.password_hint')} />
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : t('settings.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Claim Mailbox — show if no stalwart account */}
          {!accounts.some(a => a.provider === 'stalwart') && (
            <ClaimMailboxCard onClaimed={load} />
          )}

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance')}</CardTitle>
              <CardDescription>{t('settings.appearance_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm">{theme === 'dark' ? t('settings.dark_mode') : t('settings.light_mode')}</span>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  {theme === 'dark' ? t('settings.switch_light') : t('settings.switch_dark')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Accounts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('settings.email_accounts')}</CardTitle>
                  <CardDescription>{t('settings.email_accounts_desc')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
                  <Plus className="h-3 w-3" /> {t('settings.add')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showAdd && (
                <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-3 fade-in">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      {['gmail', 'qq', 'outlook', '163', 'nothing', 'custom'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <Input value={accEmail} onChange={(e) => setAccEmail(e.target.value)} placeholder="Email" className="flex-1" />
                    <Input value={accPass} onChange={(e) => setAccPass(e.target.value)} placeholder="Password" type="password" className="flex-1" />
                  </div>
                  {addError && <p className="text-xs text-destructive">{addError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddAccount} disabled={adding}>
                      {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : t('settings.add_account')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              {accounts.length === 0 && !showAdd && (
                <p className="text-sm text-muted-foreground">{t('settings.no_accounts')}</p>
              )}

              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-xl border border-border p-5 transition-all duration-150 hover:bg-accent/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Status dot */}
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${acc.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{acc.email}</span>
                          <Badge variant="secondary" className="text-xs uppercase">{acc.provider}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {acc.is_active ? t('settings.connected') : t('settings.disconnected')}
                          {acc.last_sync_at && ` · ${t('settings.last_synced', { time: new Date(acc.last_sync_at).toLocaleString() })}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" disabled={testingId === acc.id} onClick={() => handleTestAccount(acc.id)}>
                      {testingId === acc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />} {t('settings.test')}
                    </Button>
                    <Button variant="outline" size="sm" disabled={syncingId === acc.id} onClick={async () => {
                      setSyncingId(acc.id);
                      setSyncProgress('...');
                      try {
                        const res = await api.syncAccount(acc.id, 'nmp');
                        const result = await pollTask(res.task_id);
                        toast({ title: t('settings.synced_nmp', { count: result.new_messages || 0 }), variant: 'success' });
                        load();
                      } catch (err: any) {
                        toast({ title: t('settings.sync_failed'), description: err.message, variant: 'error' });
                      }
                      setSyncingId(null);
                      setSyncProgress('');
                    }}>
                      {syncingId === acc.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {syncProgress}</> : <><RefreshCw className="h-3.5 w-3.5" /> {t('settings.sync_nmp')}</>}
                    </Button>
                    <Button variant="outline" size="sm" disabled={syncingId === acc.id} onClick={async () => {
                      setSyncingId(acc.id);
                      setSyncProgress('...');
                      try {
                        const res = await api.syncAccount(acc.id, 'all');
                        const result = await pollTask(res.task_id);
                        toast({ title: t('settings.imported', { count: result.new_messages || 0 }), variant: 'success' });
                        load();
                      } catch (err: any) {
                        toast({ title: t('settings.sync_failed'), description: err.message, variant: 'error' });
                      }
                      setSyncingId(null);
                      setSyncProgress('');
                    }}>
                      {syncingId === acc.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {syncProgress}</> : <><RefreshCw className="h-3.5 w-3.5" /> {t('settings.import_all')}</>}
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const ok = await confirm({ title: t('confirm.clear_messages_title'), description: t('confirm.clear_messages_desc', { email: acc.email }), confirmText: t('confirm.clear_messages_btn'), variant: 'destructive' });
                      if (!ok) return;
                      await api.clearAccountMessages(acc.id);
                      toast({ title: 'Messages cleared', variant: 'success' });
                    }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> {t('settings.clear')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const ok = await confirm({ title: t('confirm.remove_account_title'), description: t('confirm.remove_account_desc', { email: acc.email }), confirmText: t('confirm.remove_account_btn'), variant: 'destructive' });
                      if (!ok) return;
                      await api.removeAccount(acc.id);
                      load();
                    }} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> {t('settings.remove')}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('settings.api_keys')}</CardTitle>
                  <CardDescription>{t('settings.api_keys_desc')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowKeyForm(!showKeyForm)}>
                  <Plus className="h-3 w-3" /> {t('settings.create')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showKeyForm && !newKey && (
                <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-3 fade-in">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t('settings.key_name')}</label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder={t('settings.key_name_placeholder')}
                      className="mt-1"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateKey} disabled={!newKeyName.trim()}>{t('settings.create_key')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowKeyForm(false); setNewKeyName(''); }}>{t('common.cancel')}</Button>
                  </div>
                </div>
              )}

              {newKey && (
                <div className="rounded-xl border border-border bg-accent p-4 fade-in">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">{t('settings.new_key_notice')}</p>
                  <code className="mt-2 block break-all font-mono text-sm text-foreground">{newKey}</code>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyKey}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? t('common.copied') : t('common.copy')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setNewKey('')}>{t('common.dismiss')}</Button>
                  </div>
                </div>
              )}

              {keys.length === 0 && !newKey && (
                <p className="text-sm text-muted-foreground">No API keys</p>
              )}

              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-xl border border-border p-4 transition-all duration-200 hover:bg-accent/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{k.name}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {k.permissions.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs uppercase tracking-wider">{p}</Badge>
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground/60">
                        {new Date(k.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => api.deleteKey(k.id).then(load)}
                  >
                    {t('settings.revoke')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Danger */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">{t('settings.danger')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('settings.sign_out')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.sign_out_desc')}</p>
                </div>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={logout}>
                  <LogOut className="h-3 w-3" /> {t('settings.sign_out')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function ClaimMailboxCard({ onClaimed }: { onClaimed: () => void }) {
  const { t } = useTranslation();
  const [mailDomain, setMailDomain] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetch('/api/setup/status').then(r => r.json()).then(data => {
      if (data.mail_domain) setMailDomain(data.mail_domain);
    }).catch(() => {});
  }, []);

  if (!mailDomain) return null;

  const handleClaim = async () => {
    if (!password) return;
    setClaiming(true);
    try {
      const res = await api.claimMailbox({ username: username || undefined, password });
      toast({ title: `Mailbox created: ${res.email}`, variant: 'success' });
      onClaimed();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'error' });
    }
    setClaiming(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mailbox</CardTitle>
        <CardDescription>Claim your @{mailDomain} email address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-0">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
            placeholder="username"
            className="rounded-r-none"
          />
          <span className="flex h-10 items-center rounded-r-lg border border-l-0 border-border bg-muted px-3 text-sm text-muted-foreground">
            @{mailDomain}
          </span>
        </div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mailbox password (min 8 chars, A-z, 0-9)"
        />
        <p className="text-xs text-muted-foreground">Must contain uppercase, lowercase and number</p>
        <Button size="sm" onClick={handleClaim} disabled={claiming || password.length < 8}>
          {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Claim mailbox'}
        </Button>
      </CardContent>
    </Card>
  );
}
