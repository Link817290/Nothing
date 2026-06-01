import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, Send, PenSquare, Settings, Plug,
  FolderOpen, Users, Globe, Mail, Server, GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';

interface ProjectInfo { name: string; unread: number }

export function Sidebar() {
  const location = useLocation();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.projects().then((r) => setProjects(r.projects || [])).catch(() => {});
    api.inbox({ limit: '1' }).then((r) => setUnreadCount(r.total_unread || 0)).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const path = location.pathname;
  const isActive = (href: string) =>
    href === '/dashboard' ? (path === '/' || path === '/dashboard')
    : path === href || path.startsWith(href + '/') || path.startsWith(href + '?');

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 top-16 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 bottom-0 z-30 flex w-64 flex-col border-r border-border bg-sidebar-bg transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full',
        )}
      >
        <div className="flex-1 overflow-y-auto py-4 [scrollbar-width:thin]">
          <nav className="flex flex-col gap-0.5 px-3">
            <SectionLabel>{t('nav.overview')}</SectionLabel>
            <NavItem icon={LayoutDashboard} label={t('nav.dashboard')} href="/dashboard" active={isActive('/dashboard')} />

            <SectionLabel>{t('nav.mail')}</SectionLabel>
            <NavItem icon={GitBranch} label="Threads" href="/threads" active={isActive('/threads')} />
            <NavItem icon={Inbox} label={t('nav.inbox')} href="/inbox" active={isActive('/inbox')} badge={unreadCount || undefined} />
            <NavItem icon={Send} label={t('nav.sent')} href="/sent" active={isActive('/sent')} />
            <NavItem icon={PenSquare} label={t('nav.compose')} href="/compose" active={isActive('/compose')} />

            {projects.length > 0 && (
              <>
                <SectionLabel>Projects</SectionLabel>
                {projects.map((p) => (
                  <NavItem
                    key={p.name}
                    icon={FolderOpen}
                    label={p.name}
                    href={`/inbox?project=${p.name}`}
                    badge={p.unread || undefined}
                    dim
                  />
                ))}
              </>
            )}

            <SectionLabel>{t('nav.manage')}</SectionLabel>
            <NavItem icon={Plug} label={t('nav.connect')} href="/connect" active={isActive('/connect')} />
            <NavItem icon={Settings} label={t('nav.settings')} href="/settings" active={isActive('/settings')} />

            {user?.is_admin && (
              <>
                <SectionLabel>{t('nav.admin')}</SectionLabel>
                <NavItem icon={Users} label={t('nav.users')} href="/admin/users" active={isActive('/admin/users')} />
                <NavItem icon={Globe} label={t('nav.domains')} href="/admin/domains" active={isActive('/admin/domains')} />
                <NavItem icon={Mail} label={t('nav.mailboxes')} href="/admin/mailboxes" active={isActive('/admin/mailboxes')} />
                <NavItem icon={Server} label={t('nav.system')} href="/admin/system" active={isActive('/admin/system')} />
              </>
            )}
          </nav>
        </div>

        {/* Bottom nav bar on mobile */}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md md:hidden">
        <MobileNavItem icon={LayoutDashboard} href="/dashboard" active={isActive('/dashboard')} label="Home" />
        <MobileNavItem icon={Inbox} href="/inbox" active={isActive('/inbox')} label="Inbox" badge={unreadCount || undefined} />
        <MobileNavItem icon={PenSquare} href="/compose" active={isActive('/compose')} label="Compose" />
        <MobileNavItem icon={Send} href="/sent" active={isActive('/sent')} label="Sent" />
        <MobileNavItem icon={Settings} href="/settings" active={isActive('/settings')} label="Settings" />
      </nav>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-1.5 first:pt-1 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  );
}

function NavItem({ icon: Icon, label, href, active, badge, dim }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active?: boolean;
  badge?: number;
  dim?: boolean;
}) {
  return (
    <Link
      to={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 relative',
        active
          ? 'bg-accent text-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        dim && !active && 'text-muted-foreground/60',
      )}
    >
      {/* Active indicator — amber left bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-brand" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand/15 px-1.5 font-mono text-xs font-semibold text-brand">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({ icon: Icon, href, active, label, badge }: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active?: boolean;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      to={href}
      className={cn(
        'relative flex flex-col items-center gap-0.5 px-2 py-1 transition-colors',
        active ? 'text-brand' : 'text-muted-foreground',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
