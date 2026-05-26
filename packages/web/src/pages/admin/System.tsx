import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw, Server, Database, Mail, Save, Trash2 } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface StatusData {
  version: string;
  uptime: number;
  counts: { users: number; email_accounts: number; messages: number; api_keys: number };
  memory: { rss: number; heap: number };
}

export default function AdminSystem() {
  const confirm = useConfirm();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [mailStatus, setMailStatus] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editSettings, setEditSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.adminStatus().catch(() => null),
      api.adminMailStatus().catch(() => ({ status: 'unreachable' })),
      api.adminSettings().catch(() => ({ settings: {} })),
    ]).then(([s, ms, st]) => {
      if (s) setStatus(s);
      setMailStatus(ms?.status || 'unreachable');
      const sett = st?.settings || {};
      setSettings(sett);
      setEditSettings(sett);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await api.adminUpdateSettings(editSettings);
      setSettings(res.settings || editSettings);
      toast({ title: 'Settings saved', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'error' });
    }
    setSaving(false);
  };

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-10 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Server status and settings</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="space-y-6 fade-in">
          {/* Server Status */}
          {status && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" /> Server
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Version" value={status.version} />
                  <Stat label="Uptime" value={formatUptime(status.uptime)} />
                  <Stat label="Memory (RSS)" value={`${status.memory.rss} MB`} />
                  <Stat label="Heap" value={`${status.memory.heap} MB`} />
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Users" value={status.counts.users} />
                  <Stat label="Email Accounts" value={status.counts.email_accounts} />
                  <Stat label="Messages" value={status.counts.messages} />
                  <Stat label="API Keys" value={status.counts.api_keys} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mail Engine */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> Mail Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  mailStatus === 'ok'
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                    : 'bg-destructive shadow-[0_0_6px_rgba(234,88,12,0.5)]'
                }`} />
                <span className="text-sm font-medium text-foreground">
                  {mailStatus === 'ok' ? 'Stalwart Connected' : 'Not Connected'}
                </span>
              </div>
              {mailStatus !== 'ok' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Stalwart mail server is not running. Third-party email accounts (Gmail, QQ) still work. Self-hosted mailboxes (@yourdomain.com) require Stalwart.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" /> Settings
                  </CardTitle>
                  <CardDescription>Global server configuration</CardDescription>
                </div>
                <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(editSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <div className="w-48 shrink-0">
                      <p className="text-sm font-medium">{settingLabel(key)}</p>
                      <p className="text-xs text-muted-foreground">{settingDesc(key)}</p>
                    </div>
                    <Input
                      value={value}
                      onChange={(e) => setEditSettings((p) => ({ ...p, [key]: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                ))}
                {Object.keys(editSettings).length === 0 && (
                  <p className="text-sm text-muted-foreground">No settings configured</p>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Data Management */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Clear all messages</p>
                  <p className="text-xs text-muted-foreground">Delete all emails from the database. Accounts and users are kept.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={async () => {
                    const ok = await confirm({ title: 'Clear all messages', description: 'Delete ALL messages from the database? Accounts and users are kept. This cannot be undone.', confirmText: 'Delete all', variant: 'destructive' });
                    if (!ok) return;
                    await api.adminClearMessages();
                    toast({ title: 'All messages deleted', variant: 'success' });
                    load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Messages
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Full server reset</p>
                  <p className="text-xs text-muted-foreground">Delete everything except your admin account.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={async () => {
                    const ok = await confirm({ title: 'Full server reset', description: 'This deletes all messages, accounts, users, and settings. Only your admin account survives. This cannot be undone.', confirmText: 'Reset everything', variant: 'destructive' });
                    if (!ok) return;
                    await api.adminReset();
                    toast({ title: 'Server reset complete', variant: 'success' });
                    load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Full Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1 font-mono">{value}</p>
    </div>
  );
}

const SETTING_LABELS: Record<string, [string, string]> = {
  open_registration: ['Open Registration', 'Allow new users to create accounts'],
  server_name: ['Server Name', 'Display name for this instance'],
  max_accounts_per_user: ['Max Accounts', 'Maximum email accounts per user'],
};

function settingLabel(key: string) { return SETTING_LABELS[key]?.[0] || key; }
function settingDesc(key: string) { return SETTING_LABELS[key]?.[1] || ''; }
