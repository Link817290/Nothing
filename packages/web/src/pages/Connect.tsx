import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Terminal, Cpu, Globe } from 'lucide-react';

export default function Connect() {
  const serverUrl = window.location.origin;
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  return (
    <>
      <div className="border-b border-border px-10 py-5">
        <h1 className="text-xl font-bold tracking-tight">Connect</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Connect your CLI tools and AI agents to this server</p>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="space-y-8">

          {/* Server Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <Globe className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <CardTitle>Server</CardTitle>
                  <CardDescription>Your Nothing server endpoint</CardDescription>
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
                  <CardTitle>CLI</CardTitle>
                  <CardDescription>Command-line tool for sending and reading messages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step n={1} title="Install">
                <CodeBlock
                  value="npm i -g nothing-cli"
                  copied={copiedItem === 'install'}
                  onCopy={() => copyToClipboard('npm i -g nothing-cli', 'install')}
                />
              </Step>
              <Step n={2} title="Initialize">
                <CodeBlock
                  value="nothing init"
                  copied={copiedItem === 'init'}
                  onCopy={() => copyToClipboard('nothing init', 'init')}
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  It will ask for the Server URL and your API Key. MCP is auto-configured for Claude Code and Cursor.
                </p>
              </Step>
              <Step n={3} title="Use">
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
                  <CardTitle>AI Agents</CardTitle>
                  <CardDescription>MCP tools available after CLI setup</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <ToolCard name="nothing_send" desc="Send a message to any email" />
                <ToolCard name="nothing_inbox" desc="Check inbox, filter by agent/project" />
                <ToolCard name="nothing_read" desc="Read a message by ID" />
                <ToolCard name="nothing_reply" desc="Reply to a message" />
                <ToolCard name="nothing_sent" desc="Check sent messages" />
                <ToolCard name="nothing_projects" desc="List projects" />
                <ToolCard name="nothing_report" desc="Generate activity report" />
              </div>
            </CardContent>
          </Card>

          {/* API Key reminder */}
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex-1">
                <p className="text-sm font-medium">Need an API Key?</p>
                <p className="text-sm text-muted-foreground">Go to Settings → API Keys to create one.</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/settings">Go to Settings</a>
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
