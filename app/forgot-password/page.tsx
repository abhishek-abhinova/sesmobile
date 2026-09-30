import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'Forgot password',
    description: `Request a password reset link for your ${settings.businessName} account.`,
    path: '/forgot-password',
    brand: toSeoBrand(settings),
    noIndex: true,
  });
}

export default async function ForgotPasswordPage() {
  const settings = await getSettings();

  return (
    <div className="container py-10 lg:py-16">
      <ForgotPasswordForm whatsappNumber={settings.whatsappNumber} />
    </div>
  );
}
