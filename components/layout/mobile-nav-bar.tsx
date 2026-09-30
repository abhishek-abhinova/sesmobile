'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Heart, User, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewerSummary } from '@/components/layout/types';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Shop', icon: LayoutGrid },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/retailer', label: 'Wholesale', icon: Store },
  { href: '/account', label: 'Account', icon: User },
];

export function MobileNavBar({ viewer }: { viewer: ViewerSummary | null }) {
  const pathname = usePathname();

  const items = useMemo(() => {
    if (!viewer) return ITEMS;

    const next: typeof ITEMS = ITEMS.slice(0, 3);
    if (viewer.isRetailer) next.push({ href: '/retailer/dashboard', label: 'Dashboard', icon: Store });
    if (viewer.isAdmin || viewer.isEditor) next.push({ href: '/admin', label: 'Admin', icon: LayoutGrid });
    next.push({ href: '/account', label: 'Account', icon: User });
    return next;
  }, [viewer]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl safe-bottom md:hidden dark:border-white/10 dark:bg-brand-navy-950/95 no-print"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition',
                  active ? 'text-brand-blue-600 dark:text-brand-blue-400' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.4]')} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
