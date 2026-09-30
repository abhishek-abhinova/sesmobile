import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/shared/section-heading';

export function BrandCloud({
  brands,
}: {
  brands: Array<{ id: string; name: string; slug: string; logoUrl: string | null; productCount: number }>;
}) {
  if (brands.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {brands.map((brand) => (
        <Link
          key={brand.id}
          href={`/products?brand=${encodeURIComponent(brand.slug)}`}
          className="group flex h-20 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-3 transition hover:border-brand-blue-300 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.03]"
        >
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="max-h-10 w-auto max-w-[7.5rem] object-contain opacity-80 transition group-hover:opacity-100"
              loading="lazy"
            />
          ) : (
            <span className="text-sm font-bold tracking-tight text-slate-500 transition group-hover:text-brand-blue-600 dark:text-slate-300">
              {brand.name}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function StatsBand({
  productCount,
  brandCount,
  categoryCount,
  city,
}: {
  productCount: number;
  brandCount: number;
  categoryCount: number;
  city: string;
}) {
  const stats = [
    { value: productCount > 0 ? `${productCount}+` : 'Bulk', label: 'Products in catalogue' },
    { value: brandCount > 0 ? `${brandCount}+` : 'Top', label: 'Brands supported' },
    { value: categoryCount > 0 ? `${categoryCount}+` : 'Multi', label: 'Product categories' },
    { value: city, label: 'Local shop & delivery' },
  ];

  return (
    <section className="bg-brand-navy-950 py-14 text-white lg:py-16">
      <div className="container">
        <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center lg:text-left">
              <dt className="order-2 mt-1 text-xs uppercase tracking-wider text-white/50">{stat.label}</dt>
              <dd className="font-display text-3xl font-extrabold tracking-tight lg:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function CtaBanner({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="container pb-14 lg:pb-20">
      <div className="flex flex-col items-start gap-6 rounded-3xl border border-slate-200 bg-surface-gradient p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
        <div className="max-w-2xl">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button asChild>
            <a href={primary.href}>{primary.label}</a>
          </Button>
          {secondary ? (
            <Button variant="outline" asChild>
              <a href={secondary.href}>{secondary.label}</a>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Section({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
        className="mb-6"
      />
      {children}
    </section>
  );
}
