import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';

interface DnsStatus {
  mx: boolean;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
}

export default function AdminDomains() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [dnsResults, setDnsResults] = useState<Record<string, DnsStatus>>({});
  const [verifying, setVerifying] = useState<string | null>(null);

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
      if (res.dns) setDnsResults((p) => ({ ...p, [newName.trim()]: res.dns }));
      setNewName('');
      setShowAdd(false);
      load();
      toast({ title: 'Domain added', variant: 'success' });
    } catch (err: any) {
      setAddError(err.message);
    }
    setAdding(false);
  };

  const handleVerify = async (name: string) => {
    setVerifying(name);
    try {
      const dns = await api.adminVerifyDomain(name);
      setDnsResults((p) => ({ ...p, [name]: dns }));
      toast({ title: `DNS checked for ${name}`, variant: 'info' });
    } catch {}
    setVerifying(null);
  };

  const handleDelete = async (name: string) => {
    await api.adminDeleteDomain(name);
    toast({ title: 'Domain deleted', variant: 'success' });
    load();
  };

  const DnsIcon = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />;

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-10 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Domains</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Mail engine domain management</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" /> Add Domain
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="space-y-4 fade-in">
          {showAdd && (
            <Card className="fade-in">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="example.com" className="flex-1" />
                  <Button size="sm" onClick={handleAdd} disabled={adding}>
                    {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : domains.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No domains configured</p>
          ) : (
            domains.map((d: any) => {
              const name = typeof d === 'string' ? d : d.name || d.id;
              const dns = dnsResults[name];
              return (
                <Card key={name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{name}</p>
                        {dns && (
                          <div className="mt-2 flex items-center gap-4">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><DnsIcon ok={dns.mx} /> MX</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><DnsIcon ok={dns.spf} /> SPF</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><DnsIcon ok={dns.dkim} /> DKIM</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><DnsIcon ok={dns.dmarc} /> DMARC</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleVerify(name)} disabled={verifying === name}>
                          {verifying === name ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Verify DNS
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(name)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
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
