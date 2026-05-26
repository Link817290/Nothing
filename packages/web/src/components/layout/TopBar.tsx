import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Menu, Search, PanelLeftClose, PanelLeft, Globe, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useLocaleStore, type Locale } from '@/stores/localeStore';
import { useState } from 'react';

const LANGUAGES: { value: Locale; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
];

export function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/inbox?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background px-5">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden md:inline-flex">
        {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
        <Menu className="h-4 w-4" />
      </Button>

      <Link to="/" className="flex shrink-0 items-center gap-2.5">
        <span className="text-xl font-bold tracking-tight text-foreground">nothing</span>
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      </Link>

      <form onSubmit={handleSearch} className="hidden flex-1 items-center justify-center px-4 md:flex">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="pl-10 bg-secondary/50 border-transparent focus-visible:border-border"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1">
        {/* Language switcher */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[160px] rounded-xl border border-border bg-background p-1.5 shadow-lg"
            >
              {LANGUAGES.map((lang) => (
                <DropdownMenu.Item
                  key={lang.value}
                  onClick={() => setLocale(lang.value)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none cursor-pointer transition-colors hover:bg-accent"
                >
                  <span>{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {locale === lang.value && <Check className="h-4 w-4 text-brand" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="flex items-center gap-2 pl-3 border-l border-border ml-2">
          <span className="hidden text-sm text-muted-foreground md:inline truncate max-w-[120px]">
            {user?.name || user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { logout(); navigate('/login'); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
