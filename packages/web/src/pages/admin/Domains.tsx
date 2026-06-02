import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Copy, Check, ChevronDown } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface DnsRecord {
  type: string;
  host: string;
  value: string;
  priority?: number;
}

interface DnsVerifyResult {
  mx: boolean;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  required: DnsRecord[];
}

export default function AdminDomains() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [dnsResults, setDnsResults] = useState<Record<string, DnsVerifyResult>>({});
  const [dnsRecords, setDnsRecords] = useState<Record<string, DnsRecord[]>>({});
  const [verifying, setVerifying] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const load = () => {
    api.adminDomains().then((r) => setDomains(r.domains || []))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await api.adminCreateDomain(newName.trim());
      if (res.dns?.records) {
        setDnsRecords(p => ({ ...p, [newName.trim()]: res.dns.records }));
        setExpandedDomain(newName.trim());
      }
      setNewName('');
      setShowAdd(false);
      load();
      toast({ title: t('admin.domain_added'), variant: 'success' });
    } catch (err: any) {
      setAddError(err.message);
    }
    setAdding(false);
  };

  const handleVerify = async (name: string) => {
    setVerifying(name);
    try {
      const result = await api.adminVerifyDomain(name);
      setDnsResults(p => ({ ...p, [name]: result }));
      if (result.required) setDnsRecords(p => ({ ...p, [name]: result.required }));
      setExpandedDomain(name);
    } catch {}
    setVerifying(null);
  };

  const handleShowRecords = async (name: string) => {
    if (expandedDomain === name) {
      setExpandedDomain(null);
      return;
    }
    try {
      const res = await api.adminDomainDns(name);
      if (res.records) setDnsRecords(p => ({ ...p, [name]: res.records }));
      setExpandedDomain(name);
    } catch {}
  };

  const handleDelete = async (name: string) => {
    const ok = await confirm({
      title: t('common.delete'),
      description: t('admin.delete_domain_confirm', { name }),
      confirmText: t('common.delete'),
      variant: 'destructive',
    });
    if (!ok) return;
    await api.adminDeleteDomain(name);
    toast({ title: t('admin.domain_deleted'), variant: 'success' });
    load();
  };

  const copyValue = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedRecord(key);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const DnsIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 md:px-10 py-4 md:py-5">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('admin.domains_title')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('admin.domains_subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5" /> {t('admin.add_domain')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 md:py-6">
        <div className="space-y-4">
          {showAdd && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium">{t('admin.add_domain_hint')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.add_domain_desc')}</p>
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="example.com"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <Button size="sm" onClick={handleAdd} disabled={adding}>
                    {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('common.create')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : domains.length === 0 && !showAdd ? (
            <div className="p-12 text-center fade-in">
              <p className="text-lg font-semibold text-muted-foreground">{t('admin.no_domains')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('admin.no_domains_hint')}</p>
            </div>
          ) : (
            domains.map((d: any) => {
              const name = typeof d === 'string' ? d : d.name || d.id;
              const dns = dnsResults[name];
              const records = dnsRecords[name];
              const isExpanded = expandedDomain === name;

              return (
                <Card key={name}>
                  <CardContent className="p-5">
                    {/* Domain header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-foreground">{name}</p>
                        {dns && (
                          <div className="mt-2 flex items-center gap-3 md:gap-4 flex-wrap">
                            <span className="flex items-center gap-1.5 text-sm"><DnsIcon ok={dns.mx} /> MX</span>
                            <span className="flex items-center gap-1.5 text-sm"><DnsIcon ok={dns.spf} /> SPF</span>
                            <span className="flex items-center gap-1.5 text-sm"><DnsIcon ok={dns.dkim} /> DKIM</span>
                            <span className="flex items-center gap-1.5 text-sm"><DnsIcon ok={dns.dmarc} /> DMARC</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => handleShowRecords(name)}>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {t('admin.dns_records')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleVerify(name)} disabled={verifying === name}>
                          {verifying === name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          {t('admin.verify_dns')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(name)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* DNS Records table */}
                    {isExpanded && records && records.length > 0 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-3">{t('admin.dns_hint')}</p>
                        <div className="rounded-lg border border-border overflow-x-auto">
                          <table className="w-full text-sm min-w-[500px]">
                            <thead>
                              <tr className="border-b border-border bg-muted/50">
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Host</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Value</th>
                                <th className="w-10 px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((r, i) => {
                                const key = `${name}-${i}`;
                                return (
                                  <tr key={i} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2.5">
                                      <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium">{r.type}</span>
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-xs">{r.host}</td>
                                    <td className="px-3 py-2.5 font-mono text-xs max-w-[400px] truncate">{r.value}{r.priority ? ` (priority: ${r.priority})` : ''}</td>
                                    <td className="px-3 py-2.5">
                                      <button
                                        onClick={() => copyValue(r.value, key)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        {copiedRecord === key ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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
