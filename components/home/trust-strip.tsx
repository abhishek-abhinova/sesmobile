import Link from 'next/link';
import { Truck, BadgeCheck, Receipt, MessagesSquare, Store } from 'lucide-react';
import { CategoryIcon } from '@/components/shared/category-icon';

const PROMISES = [
  {
    icon: BadgeCheck,
    title: 'Genuine quality',
    body: 'Carefully sourced assemblies and parts, checked before dispatch.',
  },
  {
    icon: Store,
    title: 'Wholesale pricing',
    body: 'Registered retailers see dealer pricing and bulk quantities.',
  },
  {
    icon: Truck,
    title: 'Fast fulfilment',
    body: 'In-stock items are packed the same day you confirm.',
  },
  {
    icon: Receipt,
    title: 'GST invoicing',
    body: 'Proper tax invoices for every business order.',
  },
  {
    icon: MessagesSquare,
    title: 'WhatsApp first',
    body: 'Send a list, get availability and pricing in minutes.',
  },
];

export function TrustStrip() {
  return (
    <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-brand-navy-950" aria-label="Why shop with us">
      <div className="container grid grid-cols-2 gap-x-4 gap-y-6 py-8 sm:grid-cols-3 lg:grid-cols-5 lg:py-9">
        {PROMISES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-500/10 dark:text-brand-blue-300">
              <Icon className="size-5" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoryTiles({
  categories,
}: {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    imageUrl: string | null;
    productCount: number;
  }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-blue-200 hover:shadow-lift dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-brand-blue-500/40"
        >
          {category.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.imageUrl}
              alt=""
              className="size-12 rounded-xl object-contain transition group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-xl bg-slate-50 text-brand-navy-700 transition group-hover:bg-brand-blue-50 group-hover:text-brand-blue-600 dark:bg-white/[0.05] dark:text-brand-blue-300">
              <CategoryIcon name={category.icon} size={22} />
            </span>
          )}
          <span className="text-[13px] font-semibold leading-tight">{category.name}</span>
          <span className="text-[11px] text-muted-foreground">{category.productCount} products</span>
        </Link>
      ))}
    </div>
  );
}
