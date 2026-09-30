'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [identifier, setIdentifier] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (identifier.trim().length < 3) {
      setError('Enter your registered mobile number or email.');
      return;
    }

    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: { message?: string } } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? 'We could not send the reset link. Please try again.');
        return;
      }
      setSent(true);
      toast.success('Check your inbox', { description: 'If the account exists, a reset link is on its way.' });
    } catch {
      setError('We could not send the reset link. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
          <Mail className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Reset link sent</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          If an account exists for{' '}
          <span className="font-medium text-foreground">{identifier.trim()}</span>, we have emailed a link. It expires in
          one hour.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          No email? Your account may not have an email address on file — message us on WhatsApp and we will help.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <Button asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
          <Button variant="ghost" asChild>
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 size-4" />
              Chat on WhatsApp
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/[0.03] sm:p-8">
      <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter the mobile number or email on your account and we will send a reset link.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <Label htmlFor="fp-identifier">Mobile number or email</Label>
          <Input
            id="fp-identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            aria-invalid={Boolean(error)}
            className="mt-1.5"
          />
          {error ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
        </div>

        <Button type="submit" block loading={pending} icon={<Mail className="size-4" />}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-brand-blue-600 hover:underline dark:text-brand-blue-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
