import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <div className="flex items-center justify-between border-b border-border px-4 md:px-10 py-4 md:py-5">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('admin.system_title')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('admin.system_subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3 w-3" /> {t('common.refresh')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 md:py-6">
        <div className="space-y-6 fade-in">
          {/* Server Status */}
          {status && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" /> {t('admin.server')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label={t("admin.version")} value={status.version} />
                  <Stat label={t("admin.uptime")} value={formatUptime(status.uptime)} />
                  <Stat label={t("admin.memory_rss")} value={`${status.memory.rss} MB`} />
                  <Stat label={t("admin.heap")} value={`${status.memory.heap} MB`} />
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label={t("admin.users_count")} value={status.counts.users} />
                  <Stat label={t("admin.accounts_count")} value={status.counts.email_accounts} />
                  <Stat label={t("admin.messages_count")} value={status.counts.messages} />
                  <Stat label={t("admin.keys_count")} value={status.counts.api_keys} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mail Engine */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> {t('admin.mail_engine')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  mailStatus === 'ok'
                    ? 'bg-emerald-500'
                    : 'bg-destructive'
                }`} />
                <span className="text-sm font-medium text-foreground">
                  {mailStatus === 'ok' ? t('admin.stalwart_connected') : t('admin.stalwart_not_connected')}
                </span>
              </div>
              {mailStatus !== 'ok' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('admin.stalwart_hint')}
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
                    <Database className="h-4 w-4 text-muted-foreground" /> {t('admin.global_settings')}
                  </CardTitle>
                  <CardDescription>{t('admin.global_settings_desc')}</CardDescription>
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
                  <div key={key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <div className="sm:w-48 sm:shrink-0">
                      <p className="text-sm font-medium">{settingLabel(key, t)}</p>
                      <p className="text-xs text-muted-foreground">{settingDesc(key, t)}</p>
                    </div>
                    <Input
                      value={value}
                      onChange={(e) => setEditSettings((p) => ({ ...p, [key]: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                ))}
                {Object.keys(editSettings).length === 0 && (
                  <p className="text-sm text-muted-foreground">t('admin.no_settings')</p>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Data Management */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">{t('admin.danger')}</CardTitle>
              <CardDescription>{t('admin.danger_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('admin.clear_messages')}</p>
                  <p className="text-xs text-muted-foreground">{t('admin.clear_messages_desc')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={async () => {
                    const ok = await confirm({ title: t('confirm.clear_all_title'), description: t('confirm.clear_all_desc'), confirmText: t('confirm.clear_all_btn'), variant: 'destructive' });
                    if (!ok) return;
                    await api.adminClearMessages();
                    toast({ title: 'All messages deleted', variant: 'success' });
                    load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t('admin.clear_messages_btn')}
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('admin.full_reset')}</p>
                  <p className="text-xs text-muted-foreground">{t('admin.full_reset_desc')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={async () => {
                    const ok = await confirm({ title: t('confirm.reset_title'), description: t('confirm.reset_desc'), confirmText: t('confirm.reset_btn'), variant: 'destructive' });
                    if (!ok) return;
                    const pw = window.prompt('Enter your password to confirm reset:');
                    if (!pw) return;
                    try {
                      await api.adminReset(pw);
                      toast({ title: 'Server reset complete', variant: 'success' });
                      load();
                    } catch (err: any) {
                      toast({ title: 'Reset failed', description: err.message, variant: 'error' });
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t('admin.full_reset_btn')}
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

// Setting labels use i18n keys: admin.setting_{key} and admin.setting_{key}_desc
function settingLabel(key: string, t: (k: string) => string) {
  const k = `admin.setting_${key}`;
  const v = t(k);
  return v !== k ? v : key;
}
function settingDesc(key: string, t: (k: string) => string) {
  const k = `admin.setting_${key}_desc`;
  const v = t(k);
  return v !== k ? v : '';
}
