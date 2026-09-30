'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Eye, EyeOff, Check } from 'lucide-react';
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

export function CustomerRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => RULES.filter((rule) => rule.test(password)).length, [password]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter your name.';
    if (phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid 10-digit mobile number.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.replace(/\D/g, '').slice(-10),
          email: email.trim() || undefined,
          password,
          confirmPassword,
        }),
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
        toast.error(failure?.message ?? 'We could not create your account. Please try again.');
        return;
      }

      toast.success('Account created', { description: 'Your wishlist now syncs across devices.' });
      router.push('/account');
      router.refresh();
    } catch {
      toast.error('We could not create your account. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/[0.03] sm:p-8">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Keep your wishlist and enquiries in one place. Retailers should use the wholesale application instead.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <Label htmlFor="reg-name">Full name</Label>
            <Input
              id="reg-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              className="mt-1.5"
            />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor="reg-phone">Mobile number</Label>
            <Input
              id="reg-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={15}
              aria-invalid={Boolean(errors.phone)}
              placeholder="10-digit mobile"
              className="mt-1.5"
            />
            {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor="reg-email">Email (optional)</Label>
            <Input
              id="reg-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              className="mt-1.5"
            />
            {errors.email ? <FieldError>{errors.email}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor="reg-password">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="reg-password"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {password ? (
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {RULES.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-[11px] ${passed ? 'text-emerald-600' : 'text-muted-foreground'}`}
                    >
                      <Check className="size-3" />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {errors.password ? <FieldError>{errors.password}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor="reg-confirm">Confirm password</Label>
            <Input
              id="reg-confirm"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              className="mt-1.5"
            />
            {errors.confirmPassword ? <FieldError>{errors.confirmPassword}</FieldError> : null}
          </div>

          <Button type="submit" block loading={pending} icon={<UserPlus className="size-4" />}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-brand-blue-600 hover:underline dark:text-brand-blue-400">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="underline">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Questions? WhatsApp us and we will create your account for you.
      </p>
      <p className="sr-only">Password strength: {strength} of {RULES.length} requirements met</p>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{children}</p>;
}
