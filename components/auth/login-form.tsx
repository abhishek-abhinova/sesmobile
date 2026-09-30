'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Eye, EyeOff, MessageCircle, Store, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginResponse {
  ok: boolean;
  user?: { role: string } | null;
  redirectTo?: string;
  error?: { message?: string; fieldErrors?: Record<string, string[]> };
}

export function LoginForm({ businessName, whatsappNumber }: { businessName: string; whatsappNumber: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: { identifier?: string; password?: string } = {};
    if (identifier.trim().length < 3) nextErrors.identifier = 'Enter your mobile number or email.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const json = (await res.json().catch(() => null)) as LoginResponse | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        setErrors({
          identifier: failure?.fieldErrors?.identifier?.[0],
          password: failure?.fieldErrors?.password?.[0],
        });
        toast.error(failure?.message ?? 'Sign in failed. Please try again.');
        return;
      }

      toast.success('Signed in', { description: 'Welcome back.' });
      const destination = next && next.startsWith('/') ? next : (json.redirectTo ?? '/account');
      router.push(destination);
      router.refresh();
    } catch {
      toast.error('Sign in failed. Please check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/[0.03] sm:p-8">
        <h1 className="font-display text-2xl font-bold">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Use the mobile number or email you registered with.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <Label htmlFor="identifier">Mobile number or email</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              inputMode="email"
              aria-invalid={Boolean(errors.identifier)}
              placeholder="88923 99728 or you@example.com"
              className="mt-1.5"
            />
            {errors.identifier ? <FieldError>{errors.identifier}</FieldError> : null}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs font-medium text-brand-blue-600 hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <Input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password ? <FieldError>{errors.password}</FieldError> : null}
          </div>

          <Button type="submit" block loading={pending} icon={<LogIn className="size-4" />}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link href="/register" className="font-semibold text-brand-blue-600 hover:underline dark:text-brand-blue-400">
            Create a customer account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Shop owner?{' '}
          <Link
            href="/retailer/register"
            className="font-semibold text-brand-blue-600 hover:underline dark:text-brand-blue-400"
          >
            Apply for wholesale
          </Link>
        </p>
      </div>

      <div className="flex flex-col justify-center gap-4">
        <div className="rounded-2xl border border-slate-200 p-6 dark:border-white/10">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <User className="size-4 text-brand-blue-600" />
            Customer accounts
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Save your wishlist across devices, get wholesale enquiries in one place and track your requests.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-6 dark:border-white/10">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Store className="size-4 text-brand-orange-500" />
            Retailer accounts
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Approved retailers see wholesale pricing, minimum order quantities and dealer terms across the catalogue.
          </p>
        </div>

        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 p-5 transition hover:bg-[#25D366]/10"
        >
          <MessageCircle className="size-5 shrink-0 text-[#25D366]" />
          <span className="text-sm">
            <span className="block font-semibold">Trouble signing in?</span>
            <span className="text-muted-foreground">Message {businessName} on WhatsApp and we will help.</span>
          </span>
        </a>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{children}</p>;
}
