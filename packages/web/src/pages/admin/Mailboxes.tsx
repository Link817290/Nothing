import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Mail } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';

export default function AdminMailboxes() {
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

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
      setUsername('');
      setEmail('');
      setPassword('');
      setShowAdd(false);
      load();
      toast({ title: 'Mailbox created', variant: 'success' });
    } catch (err: any) {
      setAddError(err.message);
    }
    setAdding(false);
  };

  const handleDelete = async (name: string) => {
    await api.adminDeleteMailbox(name);
    toast({ title: 'Mailbox deleted', variant: 'success' });
    load();
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-10 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Mailboxes</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Mail engine mailbox management</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" /> Create Mailbox
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="space-y-4 fade-in">
          {showAdd && (
            <Card className="fade-in">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@domain.com" />
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={adding}>
                    {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : mailboxes.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No mailboxes configured</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {mailboxes.map((mb: any) => {
                    const name = typeof mb === 'string' ? mb : mb.name || mb.email || mb.id;
                    return (
                      <div key={name} className="flex items-center justify-between p-4 transition-all duration-200 hover:bg-accent/30">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(name)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
