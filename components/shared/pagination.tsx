'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;

  function href(target: number): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || key === 'page') continue;
      if (Array.isArray(value)) value.forEach((v) => search.append(key, v));
      else search.set(key, value);
    }
    search.set('page', String(target));
    return `${basePath}?${search.toString()}`;
  }

  const window = 1;
  const pages: (number | 'gap')[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= window) pages.push(i);
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap');
  }

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <PageLink href={href(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </PageLink>

      {pages.map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1.5 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'grid size-9 place-items-center rounded-lg text-sm font-semibold transition',
              item === page
                ? 'bg-brand-blue-600 text-white shadow-soft'
                : 'border border-slate-200 text-muted-foreground hover:border-brand-blue-300 hover:text-brand-blue-600 dark:border-white/10',
            )}
          >
            {item}
          </Link>
        ),
      )}

      <PageLink href={href(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
  ...rest
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
} & React.AriaAttributes) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-300 dark:border-white/10 dark:text-slate-700"
        {...rest}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="grid size-9 place-items-center rounded-lg border border-slate-200 text-muted-foreground transition hover:border-brand-blue-300 hover:text-brand-blue-600 dark:border-white/10"
      {...rest}
    >
      {children}
    </Link>
  );
}
