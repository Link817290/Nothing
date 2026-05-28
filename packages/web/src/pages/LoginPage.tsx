import { type FormEvent, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/inbox';
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [mailDomain, setMailDomain] = useState<string | null>(null);
  const [mailUsername, setMailUsername] = useState('');

  // Check if this is first-time setup
  useEffect(() => {
    fetch('/api/setup/status').then(r => r.json()).then(data => {
      if (data.needs_setup) {
        setMode('register');
        setIsFirstTime(true);
      }
      if (data.mail_domain) setMailDomain(data.mail_domain);
    }).catch(() => {});
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [mailbox, setMailbox] = useState<string | null>(null);
  const [needsEmailSetup, setNeedsEmailSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyStep, setVerifyStep] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await api.register(email, password, name || undefined, mailUsername || undefined);
        if (res.needs_verification) {
          setVerifyStep(true);
        } else {
          setAuth(res.api_key, res.user);
          setApiKey(res.api_key);
          setMailbox(res.mailbox || null);
        }
      } else {
        const res = await api.login(email, password);
        setAuth(res.token, res.user);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verification code step
  if (verifyStep) {
    const handleVerify = async (e: FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
        const res = await api.verify(email, verifyCode);
        setAuth(res.api_key, res.user);
        setApiKey(res.api_key);
        setMailbox(res.mailbox || null);
        setVerifyStep(false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="relative z-10 w-full max-w-sm fade-in">
          <CardHeader className="items-center text-center pb-2">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl font-bold tracking-tight">nothing</span>
              <span className="h-2 w-2 rounded-full bg-brand" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('login.verify_hint') || `Verification code sent to ${email}`}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Verification Code</label>
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                />
              </div>
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || verifyCode.length !== 6}>
                {loading ? <Loader2 className="animate-spin" /> : 'Verify'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setVerifyStep(false); setVerifyCode(''); setError(''); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // API key reveal after registration
  if (apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        {/* Subtle gradient accent */}
          <Card className="relative z-10 w-full max-w-md fade-in">
          <CardHeader className="items-center text-center pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-bold tracking-tight">nothing</span>
              <span className="h-2 w-2 rounded-full bg-brand " />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {mailbox && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your mailbox</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{mailbox}</p>
              </div>
            )}
            {needsEmailSetup && (
              <div className="rounded-xl border border-border bg-accent p-4">
                <p className="text-sm text-muted-foreground">No email service configured on this server. Go to Settings to connect your Gmail, QQ, or Outlook account.</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('login.api_key_notice')}</p>
              <h2 className="mt-2 text-xl font-bold">{t('login.api_key_title')}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {t('login.api_key_desc')}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <code className="block break-all font-mono text-sm text-foreground">{apiKey}</code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t('common.copied') : t('common.copy')}
              </Button>
            </div>
            <Button className="w-full" onClick={() => navigate('/inbox', { replace: true })}>
              {t('login.continue')}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Subtle gradient accent */}

      <Card className="relative z-10 w-full max-w-sm fade-in">
        <CardHeader className="items-center text-center pb-2">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-2xl font-bold tracking-tight">nothing</span>
            <span className="h-2 w-2 rounded-full bg-brand " />
          </div>
          <p className="text-sm text-muted-foreground">
            {isFirstTime
              ? t('login.first_time')
              : mode === 'login' ? t('login.sign_in') : t('login.register')}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t('login.name')}</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('login.name_hint')}
                  />
                </div>
                {mailDomain && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Mailbox</label>
                    <div className="flex items-center gap-0">
                      <Input
                        value={mailUsername}
                        onChange={(e) => setMailUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        placeholder="username"
                        className="rounded-r-none"
                      />
                      <span className="flex h-10 items-center rounded-r-lg border border-l-0 border-border bg-muted px-3 text-sm text-muted-foreground">
                        @{mailDomain}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t('login.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t('login.password')}</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="--------"
                required
              />
              {mode === 'register' && password && password.length < 8 && (
                <p className="text-xs text-muted-foreground">Min 8 chars, with uppercase, lowercase and number</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? t('login.submit_login') : t('login.submit_register')}
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {mode === 'login' ? t('login.switch_register') : t('login.switch_login')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
