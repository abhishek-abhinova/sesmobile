import type { Metadata } from 'next';
import { buildCmsMetadata, buildCmsElement } from '@/lib/cms-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const generateMetadata = (): Promise<Metadata> =>
  buildCmsMetadata('about', 'About us', (city, businessName) =>
    `Learn about ${businessName}, a mobile spare parts and accessories supplier in ${city} serving retailers and customers with genuine quality parts.`,
  );

export default function AboutPage() {
  return buildCmsElement('about');
}
