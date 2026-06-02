import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Terminal, Cpu, Globe, Monitor, Download } from 'lucide-react';

export default function Connect() {
  const { t } = useTranslation();
  const serverUrl = window.location.origin;
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-10 py-4 md:py-5">
        <h1 className="text-lg md:text-xl font-bold tracking-tight">{t('connect.title')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('connect.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8">
        <div className="space-y-8 fade-in">

          {/* Server Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <Globe className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <CardTitle>{t('connect.server')}</CardTitle>
                  <CardDescription>{t('connect.server_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CodeBlock
                value={serverUrl}
                copied={copiedItem === 'url'}
                onCopy={() => copyToClipboard(serverUrl, 'url')}
              />
            </CardContent>
          </Card>

          {/* CLI Setup */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                  <Terminal className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle>{t('connect.cli')}</CardTitle>
                  <CardDescription>{t('connect.cli_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step n={1} title={t('connect.install')}>
                <CodeBlock
                  value="npm i -g nothing-cli"
                  copied={copiedItem === 'install'}
                  onCopy={() => copyToClipboard('npm i -g nothing-cli', 'install')}
                />
              </Step>
              <Step n={2} title={t('connect.initialize')}>
                <CodeBlock
                  value="nothing init"
                  copied={copiedItem === 'init'}
                  onCopy={() => copyToClipboard('nothing init', 'init')}
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('connect.init_hint')}
                </p>
              </Step>
              <Step n={3} title={t('connect.use')}>
                <div className="space-y-2">
                  <CodeBlock value="nothing inbox" compact />
                  <CodeBlock value="nothing send agent@example.com 'Hello'" compact />
                  <CodeBlock value="nothing read <message-id>" compact />
                </div>
              </Step>
            </CardContent>
          </Card>

          {/* MCP / Agent */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                  <Cpu className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle>{t('connect.agents')}</CardTitle>
                  <CardDescription>{t('connect.agents_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <ToolCard name="nothing_send" desc={t('connect.tool_send')} />
                <ToolCard name="nothing_inbox" desc={t('connect.tool_inbox')} />
                <ToolCard name="nothing_read" desc={t('connect.tool_read')} />
                <ToolCard name="nothing_reply" desc={t('connect.tool_reply')} />
                <ToolCard name="nothing_sent" desc={t('connect.tool_sent')} />
                <ToolCard name="nothing_projects" desc={t('connect.tool_projects')} />
                <ToolCard name="nothing_report" desc={t('connect.tool_report')} />
              </div>
            </CardContent>
          </Card>

          {/* Desktop App */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
                  <Monitor className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle>{t('connect.desktop')}</CardTitle>
                  <CardDescription>{t('connect.desktop_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/Link817290/Nothing/releases/latest" target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" /> Windows (.exe)
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/Link817290/Nothing/releases/latest" target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" /> Linux (.AppImage)
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Key reminder */}
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex-1">
                <p className="text-sm font-medium">{t('connect.need_key')}</p>
                <p className="text-sm text-muted-foreground">{t('connect.need_key_hint')}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/settings">{t('connect.go_settings')}</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">{n}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ value, copied, onCopy, compact }: { value: string; copied?: boolean; onCopy?: () => void; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border border-border bg-muted/50 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <code className={`font-mono ${compact ? 'text-xs' : 'text-sm'} text-foreground`}>{value}</code>
      {onCopy && (
        <button onClick={onCopy} className="ml-3 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

function ToolCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="font-mono text-sm font-medium text-foreground">{name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
