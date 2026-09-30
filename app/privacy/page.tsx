import type { Metadata } from 'next';
import { buildCmsMetadata, buildCmsElement } from '@/lib/cms-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const generateMetadata = (): Promise<Metadata> =>
  buildCmsMetadata('privacy', 'Privacy policy', () =>
    'How S.E.S Mobile World collects, uses and protects your personal information when you browse our catalogue or contact us.',
  );

export default function PrivacyPage() {
  return buildCmsElement('privacy');
}
