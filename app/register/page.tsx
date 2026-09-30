import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { CustomerRegisterForm } from '@/components/auth/register-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'Create an account',
    description: `Create a free customer account at ${settings.businessName} to save products and send enquiries.`,
    path: '/register',
    brand: toSeoBrand(settings),
    noIndex: true,
  });
}

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/account');

  return (
    <div className="container py-10 lg:py-16">
      <CustomerRegisterForm />
    </div>
  );
}
