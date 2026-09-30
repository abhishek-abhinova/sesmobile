'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BUSINESS_TYPES = [
  { value: 'MOBILE_SHOP', label: 'Mobile shop' },
  { value: 'MOBILE_REPAIR_SHOP', label: 'Mobile repair shop' },
  { value: 'ACCESSORIES_DEALER', label: 'Accessories dealer' },
  { value: 'ELECTRONICS_DEALER', label: 'Electronics dealer' },
  { value: 'ONLINE_RESELLER', label: 'Online reseller' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'OTHER', label: 'Other' },
];

const VOLUMES = [
  { value: '1_500', label: 'Up to ₹1,500 / month' },
  { value: '500_2000', label: '₹1,500 – ₹2,000 / month' },
  { value: '2000_10000', label: '₹2,000 – ₹10,000 / month' },
  { value: '10000_PLUS', label: 'Above ₹10,000 / month' },
];

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
];

export function RetailerRegisterForm({
  categories,
  requireApproval,
  businessName,
}: {
  categories: Array<{ id: string; name: string }>;
  requireApproval: boolean;
  businessName: string;
}) {
  const [form, setForm] = useState({
    contactName: '',
    businessName: '',
    businessType: 'MOBILE_SHOP',
    phone: '',
    whatsapp: '',
    email: '',
    password: '',
    confirmPassword: '',
    shopAddress: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    gstin: '',
    monthlyVolume: '',
    notes: '',
    website: '',
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (form.contactName.trim().length < 2) next.contactName = 'Enter your name.';
    if (form.businessName.trim().length < 2) next.businessName = 'Enter your shop name.';
    if (form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid 10-digit mobile number.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.';
    if (form.shopAddress.trim().length < 8) next.shopAddress = 'Enter your full shop address.';
    if (form.city.trim().length < 2) next.city = 'Enter your city.';
    if (form.state.trim().length < 2) next.state = 'Enter your state.';
    if (form.pincode && !/^[0-9]{6}$/.test(form.pincode)) next.pincode = 'Enter a valid 6-digit PIN code.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setPending(true);
    try {
      const res = await fetch('/api/retailers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: form.contactName.trim(),
          businessName: form.businessName.trim(),
          businessType: form.businessType,
          phone: form.phone.replace(/\D/g, '').slice(-10),
          whatsapp: form.whatsapp ? form.whatsapp.replace(/\D/g, '').slice(-10) : undefined,
          email: form.email.trim() || undefined,
          password: form.password,
          confirmPassword: form.confirmPassword,
          shopAddress: form.shopAddress.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode || undefined,
          gstin: form.gstin.trim() || undefined,
          categoriesInterested: selected,
          monthlyVolume: form.monthlyVolume || undefined,
          notes: form.notes.trim() || undefined,
          website: form.website,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; data?: { message?: string } }
        | { ok: false; error?: { message?: string; fieldErrors?: Record<string, string[]> } }
        | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        if (failure?.fieldErrors) {
          setErrors(Object.fromEntries(Object.entries(failure.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])));
        }
        toast.error(failure?.message ?? 'We could not submit your application. Please try again.');
        return;
      }

      setDone(
        json.data?.message ??
          (requireApproval
            ? 'Thank you. Your application is under review.'
            : 'Welcome! Your retailer account is ready.'),
      );
    } catch {
      toast.error('We could not submit your application. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
        <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
        <h1 className="mt-5 text-2xl font-bold">Application received</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{done}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Keep your login details safe — you will need them to sign in once your account is active.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">Browse the catalogue</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/[0.03] sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
          <Store className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Wholesale application</h1>
          <p className="text-sm text-muted-foreground">
            Apply for dealer pricing from {businessName}. {requireApproval ? 'We review every application.' : ''}
          </p>
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your details
        </legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" id="r-contactName" error={errors.contactName} required>
            <Input
              id="r-contactName"
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errors.contactName)}
            />
          </Field>

          <Field label="Shop / business name" id="r-businessName" error={errors.businessName} required>
            <Input
              id="r-businessName"
              value={form.businessName}
              onChange={(e) => set('businessName', e.target.value)}
              aria-invalid={Boolean(errors.businessName)}
            />
          </Field>

          <Field label="Business type" id="r-businessType" required>
            <select
              id="r-businessType"
              value={form.businessType}
              onChange={(e) => set('businessType', e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25 dark:border-white/15 dark:bg-white/[0.04]"
            >
              {BUSINESS_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mobile number" id="r-phone" error={errors.phone} required>
            <Input
              id="r-phone"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              type="tel"
              inputMode="tel"
              maxLength={15}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>

          <Field label="WhatsApp number" id="r-whatsapp" hint="If different from your mobile">
            <Input
              id="r-whatsapp"
              value={form.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              type="tel"
              inputMode="tel"
              maxLength={15}
            />
          </Field>

          <Field label="Email" id="r-email" error={errors.email}>
            <Input
              id="r-email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Shop address</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full address" id="r-shopAddress" error={errors.shopAddress} required>
              <Textarea
                id="r-shopAddress"
                value={form.shopAddress}
                onChange={(e) => set('shopAddress', e.target.value)}
                rows={2}
                aria-invalid={Boolean(errors.shopAddress)}
                placeholder="Shop / street / area"
              />
            </Field>
          </div>

          <Field label="City" id="r-city" error={errors.city} required>
            <Input
              id="r-city"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              aria-invalid={Boolean(errors.city)}
            />
          </Field>

          <Field label="State" id="r-state" error={errors.state} required>
            <Input
              id="r-state"
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              aria-invalid={Boolean(errors.state)}
            />
          </Field>

          <Field label="PIN code" id="r-pincode" error={errors.pincode}>
            <Input
              id="r-pincode"
              value={form.pincode}
              onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              aria-invalid={Boolean(errors.pincode)}
            />
          </Field>

          <Field label="GSTIN" id="r-gstin" hint="Optional — helps us set up invoicing">
            <Input
              id="r-gstin"
              value={form.gstin}
              onChange={(e) => set('gstin', e.target.value.toUpperCase().slice(0, 15))}
              className="uppercase"
            />
          </Field>

          <Field label="Average monthly purchase" id="r-monthlyVolume">
            <select
              id="r-monthlyVolume"
              value={form.monthlyVolume}
              onChange={(e) => set('monthlyVolume', e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25 dark:border-white/15 dark:bg-white/[0.04]"
            >
              <option value="">Prefer not to say</option>
              {VOLUMES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {categories.length > 0 ? (
        <fieldset className="mt-8">
          <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What are you interested in?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = selected.includes(category.name);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSelected((current) =>
                      current.includes(category.name)
                        ? current.filter((name) => name !== category.name)
                        : [...current, category.name],
                    )
                  }
                  aria-pressed={active}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                    active
                      ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-500/15 dark:text-brand-blue-300'
                      : 'border-slate-200 text-muted-foreground hover:border-brand-blue-300 dark:border-white/10'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Login details</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Password" id="r-password" error={errors.password} required>
            <div className="relative">
              <Input
                id="r-password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
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
            {form.password ? (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-[11px] ${rule.test(form.password) ? 'text-emerald-600' : 'text-muted-foreground'}`}
                  >
                    <CheckCircle2 className="size-3" />
                    {rule.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>

          <Field label="Confirm password" id="r-confirmPassword" error={errors.confirmPassword} required>
            <Input
              id="r-confirmPassword"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
            />
          </Field>
        </div>
      </fieldset>

      <div className="mt-6">
        <Field label="Anything we should know?" id="r-notes">
          <Textarea
            id="r-notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Brands you deal in, expected volumes, delivery preferences…"
          />
        </Field>
      </div>

      {/* Honeypot */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="r-website">Website</label>
        <input
          id="r-website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => set('website', e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" block loading={pending} className="mt-6">
        Submit application
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Already approved?{' '}
        <Link href="/login" className="font-semibold text-brand-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-1 text-brand-orange-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
