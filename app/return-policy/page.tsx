import type { Metadata } from 'next';
import { buildCmsMetadata, buildCmsElement } from '@/lib/cms-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const generateMetadata = (): Promise<Metadata> =>
  buildCmsMetadata('return-policy', 'Return & replacement policy', () =>
    'Our policy on returns, replacements and warranty claims for mobile spare parts and accessories purchased from S.E.S Mobile World.',
  );

export default function ReturnPolicyPage() {
  return buildCmsElement('return-policy');
}
