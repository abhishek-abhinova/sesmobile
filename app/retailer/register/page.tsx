import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { RetailerRegisterForm } from '@/components/auth/retailer-register-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: 'Wholesale / retailer application',
    description: `Apply for wholesale mobile spare parts, accessories and electronics pricing from ${settings.businessName}.`,
    path: '/retailer/register',
    brand: toSeoBrand(settings),
  });
}

export default async function RetailerRegisterPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

  if (user?.isRetailer) redirect('/retailer');
  if (user?.isAdmin || user?.isEditor) redirect('/admin');

  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { position: 'asc' },
    select: { id: true, name: true },
    take: 24,
  });

  return (
    <div className="container py-8 lg:py-12">
      <Breadcrumbs
        items={[{ name: 'Wholesale', href: '/retailer' }, { name: 'Apply' }]}
        className="mb-6"
      />
      <div className="mt-6">
        <RetailerRegisterForm
          categories={categories}
          requireApproval={settings.requireApprovalForRetailer}
          businessName={settings.businessName}
        />
      </div>
    </div>
  );
}
