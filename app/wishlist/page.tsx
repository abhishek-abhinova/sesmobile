import type { Metadata } from 'next';
import { Heart } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { buildMetadata, toSeoBrand } from '@/lib/seo';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { WishlistView } from '@/components/wishlist/wishlist-view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return buildMetadata({
    title: 'Your wishlist',
    description: `Products you have saved at ${settings.businessName}. Send the list to us for wholesale pricing.`,
    path: '/wishlist',
    brand: toSeoBrand(settings),
    noIndex: true,
  });
}

export default async function WishlistPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

  return (
    <div className="container py-6 lg:py-10">
      <Breadcrumbs items={[{ name: 'Wishlist' }]} className="mb-4" />

      <header className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-orange-50 text-brand-orange-500 dark:bg-brand-orange-500/10">
          <Heart className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Your wishlist</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Saved products — set quantities and send the list for wholesale pricing.
          </p>
        </div>
      </header>

      <WishlistView
        businessName={settings.businessName}
        whatsappNumber={settings.whatsappNumber}
        siteUrl={settings.siteUrl}
        isAuthenticated={Boolean(user)}
      />
    </div>
  );
}
