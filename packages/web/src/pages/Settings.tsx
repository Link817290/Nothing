import { useEffect, useState } from 'react';
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

interface Account { id: string; provider: string; email: string; is_active: boolean; last_sync_at?: string }
interface ApiKey { id: string; name: string; permissions: string[]; created_at: string }

export default function Settings() {
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
      toast({ title: 'Profile updated', variant: 'success' });
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

  const handleTestAccount = async (id: string) => {
    try {
      await api.testAccount(id);
      toast({ title: 'Connection test passed', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Connection test failed', description: err.message, variant: 'error' });
    }
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
      <div className="border-b border-border px-10 py-5">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Manage your profile, connected mailboxes, and access tokens</p>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="space-y-8 fade-in">

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                  <p className="font-mono text-sm text-foreground">{user?.email}</p>
                </div>
                <Badge variant={user?.is_admin ? 'brand' : 'secondary'}>
                  {user?.is_admin ? 'Admin' : 'User'}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Display name</p>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">New password</p>
                  <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to keep current" />
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Toggle between dark and light mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  Switch to {theme === 'dark' ? 'light' : 'dark'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Accounts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Accounts</CardTitle>
                  <CardDescription>Connect your Gmail, QQ, Outlook, or other email to send and receive</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showAdd && (
                <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-3 fade-in">
                  <div className="flex gap-2">
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
                      {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add account'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {accounts.length === 0 && !showAdd && (
                <p className="text-sm text-muted-foreground">No email accounts configured</p>
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
                          {acc.is_active ? 'Connected' : 'Disconnected'}
                          {acc.last_sync_at && ` · Last synced ${new Date(acc.last_sync_at).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => handleTestAccount(acc.id)}>
                      <TestTube2 className="h-3.5 w-3.5" /> Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => api.syncAccount(acc.id, 'nmp').then((r) => { toast({ title: `Synced ${r.new_messages || 0} NMP messages`, variant: 'success' }); load(); })}>
                      <RefreshCw className="h-3.5 w-3.5" /> Sync NMP
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => api.syncAccount(acc.id, 'all').then((r) => { toast({ title: `Imported ${r.new_messages || 0} emails`, variant: 'success' }); load(); })}>
                      <RefreshCw className="h-3.5 w-3.5" /> Import All
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => api.removeAccount(acc.id).then(load)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
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
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Generate keys for CLI tools and AI agents to access your account</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowKeyForm(!showKeyForm)}>
                  <Plus className="h-3 w-3" /> Create
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showKeyForm && !newKey && (
                <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-3 fade-in">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Key name</label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. my-cli, cursor-agent, production"
                      className="mt-1"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateKey} disabled={!newKeyName.trim()}>Create key</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowKeyForm(false); setNewKeyName(''); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {newKey && (
                <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 fade-in">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">New key -- copy now</p>
                  <code className="mt-2 block break-all font-mono text-sm text-foreground">{newKey}</code>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyKey}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setNewKey('')}>Dismiss</Button>
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
                    Revoke
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Danger */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Sign out</p>
                  <p className="text-xs text-muted-foreground">End this session</p>
                </div>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={logout}>
                  <LogOut className="h-3 w-3" /> Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
