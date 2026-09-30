import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { LoginForm } from '@/components/auth/login-form';
import { PageSkeleton } from '@/components/shared/page-skeleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'Sign in',
    description: `Sign in to your ${settings.businessName} account to view your wishlist, enquiries and wholesale pricing.`,
    path: '/login',
    brand: toSeoBrand(settings),
    noIndex: true,
  });
}

export default async function LoginPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

  // Already signed in — send them where they belong.
  if (user) {
    const destination = user.isAdmin || user.isEditor ? '/admin' : user.isRetailer ? '/retailer' : '/account';
    redirect(destination);
  }

  return (
    <div className="container max-w-5xl py-10 lg:py-16">
      <Suspense fallback={<PageSkeleton />}>
        <LoginForm businessName={settings.businessName} whatsappNumber={settings.whatsappNumber} />
      </Suspense>
    </div>
  );
}
