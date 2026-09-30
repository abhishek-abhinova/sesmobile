import type { Metadata } from 'next';
import { buildCmsMetadata, buildCmsElement } from '@/lib/cms-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const generateMetadata = (): Promise<Metadata> =>
  buildCmsMetadata('terms', 'Terms & conditions', () =>
    'The terms that apply when you browse the S.E.S Mobile World catalogue, place an enquiry and purchase products from our shop.',
  );

export default function TermsPage() {
  return buildCmsElement('terms');
}
