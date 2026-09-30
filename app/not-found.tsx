import Link from 'next/link';
import { Home, Search, MessageCircle, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl font-extrabold tracking-tight text-brand-blue-600 sm:text-7xl">404</p>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">We could not find that page</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The link may be old or the product may have been removed from the catalogue. Try searching for the part you
        need, or message us directly and we will check.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild icon={<Search className="size-4" />}>
          <Link href="/products">Search the catalogue</Link>
        </Button>
        <Button variant="outline" asChild icon={<Home className="size-4" />}>
          <Link href="/">Go to homepage</Link>
        </Button>
        <Button variant="whatsapp" asChild icon={<MessageCircle className="size-4" />}>
          <a href="https://wa.me/918892399728" target="_blank" rel="noopener noreferrer">
            Ask on WhatsApp
          </a>
        </Button>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">Popular:</span>
        {[
          { label: 'Displays', href: '/products?q=display' },
          { label: 'Batteries', href: '/products?q=battery' },
          { label: 'Chargers', href: '/products?q=charger' },
          { label: 'Become a retailer', href: '/retailer/register' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium transition hover:border-brand-blue-300 hover:text-brand-blue-600 dark:border-white/10"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <PackageSearch className="mt-12 size-10 text-slate-200 dark:text-slate-700" aria-hidden="true" />
    </div>
  );
}
