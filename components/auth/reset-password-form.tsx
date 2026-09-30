'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
];

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const met = useMemo(() => RULES.filter((rule) => rule.test(password)).length, [password]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: { message?: string; fieldErrors?: Record<string, string[]> } }
        | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        if (failure?.fieldErrors) {
          setErrors(Object.fromEntries(Object.entries(failure.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])));
        }
        toast.error(failure?.message ?? 'This reset link is invalid or has expired.');
        return;
      }

      toast.success('Password updated', { description: 'Sign in with your new password.' });
      router.push('/login');
    } catch {
      toast.error('We could not update your password. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/[0.03] sm:p-8">
      <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Setting a new password signs you out everywhere else.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <Label htmlFor="rp-password">New password</Label>
          <div className="relative mt-1.5">
            <Input
              id="rp-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {password ? (
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {RULES.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-[11px] ${rule.test(password) ? 'text-emerald-600' : 'text-muted-foreground'}`}
                >
                  <Check className="size-3" />
                  {rule.label}
                </li>
              ))}
            </ul>
          ) : null}
          {errors.password ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p> : null}
        </div>

        <div>
          <Label htmlFor="rp-confirm">Confirm new password</Label>
          <Input
            id="rp-confirm"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            className="mt-1.5"
          />
          {errors.confirmPassword ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.confirmPassword}</p>
          ) : null}
        </div>

        <Button type="submit" block loading={pending} icon={<KeyRound className="size-4" />}>
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Link expired?{' '}
        <Link href="/forgot-password" className="font-semibold text-brand-blue-600 hover:underline dark:text-brand-blue-400">
          Request a new one
        </Link>
      </p>
      <p className="sr-only">Password requirements met: {met} of {RULES.length}</p>
    </div>
  );
}
