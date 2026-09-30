import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Button } from '@/components/ui/button';
import type { PageProps } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'Reset password',
    description: `Set a new password for your ${settings.businessName} account.`,
    path: '/reset-password',
    brand: toSeoBrand(settings),
    noIndex: true,
  });
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<{ token?: string | string[] }>) {
  const params = await searchParams;
  await getSettings();
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = typeof raw === 'string' ? raw.trim() : '';

  if (!token) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-white/[0.03]">
          <h1 className="font-display text-2xl font-bold">This link is incomplete</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The reset link is missing its token. Request a new one and try again.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 lg:py-16">
      <ResetPasswordForm token={token} />
    </div>
  );
}
