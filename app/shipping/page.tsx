import type { Metadata } from 'next';
import { buildCmsMetadata, buildCmsElement } from '@/lib/cms-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const generateMetadata = (): Promise<Metadata> =>
  buildCmsMetadata('shipping', 'Shipping & delivery', (city, businessName) =>
    `How ${businessName} processes orders, handovers and delivery for customers and retailers in and around ${city}.`,
  );

export default function ShippingPage() {
  return buildCmsElement('shipping');
}
