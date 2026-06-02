import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Menu, Search, PanelLeftClose, PanelLeft, Globe, Check, X } from 'lucide-react';
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
  const [mobileSearch, setMobileSearch] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/inbox?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setMobileSearch(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-md px-5">
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

      {/* Desktop search */}
      <form onSubmit={handleSearch} className="hidden flex-1 items-center justify-center px-4 md:flex">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="pl-10 bg-secondary/50 border-transparent focus-visible:border-border transition-all duration-200"
          />
        </div>
      </form>

      {/* Mobile search overlay */}
      {mobileSearch && (
        <form onSubmit={handleSearch} className="absolute inset-0 z-50 flex items-center gap-2 bg-background px-4 md:hidden fade-in">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            autoFocus
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button type="button" onClick={() => { setMobileSearch(false); setQuery(''); }} className="shrink-0 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* Mobile search trigger */}
        <Button variant="ghost" size="icon" onClick={() => setMobileSearch(true)} className="md:hidden text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </Button>
        {/* GitHub */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => window.open('https://github.com/Link817290/Nothing', '_blank')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </Button>

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
