import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Crumb {
  name: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
        <li>
          <Link href="/" className="inline-flex items-center gap-1 transition hover:text-brand-blue-600">
            <Home className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
              {item.href && !last ? (
                <Link href={item.href} className="truncate transition hover:text-brand-blue-600">
                  {item.name}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground" aria-current={last ? 'page' : undefined}>
                  {item.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
