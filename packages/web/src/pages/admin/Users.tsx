import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/components/ui/toast';

interface User {
  id: string;
  email: string;
  name?: string;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.adminUsers().then((r) => setUsers(r.users || []))
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleBan = async (user: User) => {
    if (user.is_banned) {
      await api.adminUnbanUser(user.id);
      toast({ title: `Unbanned ${user.email}`, variant: 'success' });
    } else {
      await api.adminBanUser(user.id);
      toast({ title: `Banned ${user.email}`, variant: 'success' });
    }
    load();
  };

  return (
    <>
      <div className="border-b border-border px-4 md:px-10 py-4 md:py-5">
        <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('admin.users_title')}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{users.length} registered</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-4 md:py-6">
        <div className="fade-in">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 transition-all duration-200 hover:bg-accent/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{u.name || u.email}</span>
                          {u.is_admin && <Badge variant="brand" className="text-xs">Admin</Badge>}
                          {u.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground/70">{u.email}</p>
                        <p className="text-xs text-muted-foreground/50 font-mono">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!u.is_admin && (
                        <Button
                          variant={u.is_banned ? 'outline' : 'ghost'}
                          size="sm"
                          onClick={() => toggleBan(u)}
                          className={u.is_banned ? '' : 'text-destructive hover:text-destructive'}
                        >
                          {u.is_banned ? (
                            <><ShieldCheck className="h-3 w-3" /> {t('admin.unban')}</>
                          ) : (
                            <><ShieldOff className="h-3 w-3" /> {t('admin.ban')}</>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
