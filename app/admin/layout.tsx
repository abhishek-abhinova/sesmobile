import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/retailers', label: 'Retailers' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/pages', label: 'CMS pages' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login?next=/admin');
  if (!user.isAdmin && !user.isEditor) redirect('/account');

  const [productCount, pendingRetailers, newEnquiries] = await Promise.all([
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.retailerProfile.count({ where: { status: 'PENDING' } }),
    prisma.enquiry.count({ where: { status: 'NEW' } }),
  ]);

  const counts: Record<string, number> = {
    '/admin/retailers': pendingRetailers,
    '/admin/enquiries': newEnquiries,
    '/admin/products': productCount,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-navy-950">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r dark:border-white/10 dark:bg-brand-navy-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-white/10">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
                SES
              </span>
              <span className="font-display text-sm font-extrabold">Admin</span>
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="text-xs">
                View site
              </Link>
            </Button>
          </div>

          <nav className="p-3" aria-label="Admin">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {NAV.map((item) => (
                <li key={item.href} className="shrink-0">
                  <AdminNavLink href={item.href} count={counts[item.href]}>
                    {item.label}
                  </AdminNavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden border-t border-slate-200 p-4 lg:block dark:border-white/10">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.role.toLowerCase()} · {user.isEditor ? 'editor access' : 'full access'}
            </p>
            <Button variant="outline" size="sm" block className="mt-3" asChild>
              <a href="/api/auth/logout">Sign out</a>
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  count,
  children,
}: {
  href: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
    >
      <span>{children}</span>
      {count && count > 0 ? (
        <span className="rounded-full bg-brand-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
