'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, Search, ShoppingBag, Store, User, X, Sun, Moon, LayoutDashboard, LogOut, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { useTheme } from 'next-themes';
import { whatsapp } from '@/lib/whatsapp';
import { SearchOverlay } from '@/components/search/search-overlay';
import type { ContactInfo, NavCategory, ViewerSummary } from '@/components/layout/types';

const PRIMARY_LINKS = [
  { href: '/products', label: 'All Products' },
  { href: '/retailer', label: 'Wholesale' },
  { href: '/categories', label: 'Categories' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader({
  settings,
  categories,
  viewer,
}: {
  settings: ContactInfo;
  categories: NavCategory[];
  viewer: ViewerSummary | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count } = useWishlist();

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Utility strip */}
        <div className="hidden bg-brand-navy-950 text-white lg:block">
          <div className="container flex h-9 items-center justify-between text-[12px] text-white/70">
            <p className="flex items-center gap-2">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/10">
                <Phone className="size-3" />
              </span>
              <a href={`tel:${settings.phone}`} className="font-medium text-white/90 hover:text-white">
                {settings.phone}
              </a>
              <span className="text-white/25">|</span>
              <span className="truncate">{settings.address}</span>
            </p>
            <div className="flex items-center gap-5">
              <span>
                GSTIN <span className="font-medium text-white/90">{settings.gstin}</span>
              </span>
              <Link href="/retailer/register" className="font-medium text-white/90 transition hover:text-white">
                Become a retailer
              </Link>
            </div>
          </div>
        </div>

        {/* Main bar */}
        <div className="glass-nav">
          <div className="container flex h-[4.5rem] items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>

            <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${settings.businessName} home`}>
              <Image
                src="/images/logo-256.webp"
                alt={settings.businessName}
                width={40}
                height={40}
                priority
                className="size-10 rounded-xl object-contain"
              />
              <span className="hidden flex-col leading-none sm:flex">
                <span className="font-display text-[15px] font-extrabold tracking-tight text-brand-navy-900 dark:text-white">
                  S.E.S Mobile
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-600 dark:text-brand-blue-400">
                  World
                </span>
              </span>
            </Link>

            {/* Desktop category menu */}
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Categories">
              {categories.slice(0, 5).map((category) => (
                <CategoryMenu key={category.id} category={category} />
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                aria-label="Search products"
              >
                <Search className="size-5" />
              </Button>

              <Link
                href="/wishlist"
                className="relative hidden size-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 sm:flex"
                aria-label={`Wishlist, ${count} items`}
              >
                <ShoppingBag className="size-5" />
                {count > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-brand-orange-500 px-1 text-[10px] font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </Link>

              <ThemeToggle />

              {viewer ? <AccountMenu viewer={viewer} /> : <AccountLink />}

              <Button variant="whatsapp" size="sm" className="ml-1 hidden md:inline-flex" asChild={false}>
                <a
                  href={whatsapp.general({ whatsappNumber: settings.whatsappNumber, businessName: settings.businessName })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Category scroller (mobile / tablet) */}
        <div className="border-b border-slate-200/70 bg-white/90 backdrop-blur lg:hidden dark:border-white/10 dark:bg-brand-navy-950/90">
          <div className="container no-scrollbar flex items-center gap-1 overflow-x-auto py-2">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition hover:bg-brand-blue-50 hover:text-brand-blue-700 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition hover:bg-brand-blue-50 hover:text-brand-blue-700 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        settings={settings}
        categories={categories}
        viewer={viewer}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function CategoryMenu({ category }: { category: NavCategory }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 80);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <Link
        href={`/category/${category.slug}`}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-brand-blue-700 dark:text-slate-200 dark:hover:bg-white/10"
        onFocus={() => setOpen(true)}
      >
        {category.name}
        {category.children.length > 0 ? <ChevronDown className="size-3.5 opacity-60" /> : null}
      </Link>

      {open && category.children.length > 0 ? (
        <div
          className="absolute left-0 top-full z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift dark:border-white/10 dark:bg-brand-navy-900"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-brand-blue-50 hover:text-brand-blue-700 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {child.name}
            </Link>
          ))}
          <Link
            href={`/category/${category.slug}`}
            className="mt-1 block rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-blue-700 hover:bg-brand-blue-50 dark:bg-white/5 dark:text-brand-blue-300"
          >
            View all {category.name}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {mounted && resolvedTheme === 'dark' ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </Button>
  );
}

function AccountLink() {
  return (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/login" aria-label="Sign in">
        <User className="size-5" />
      </Link>
    </Button>
  );
}

function AccountMenu({ viewer }: { viewer: ViewerSummary }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Account menu" aria-expanded={open}>
        <User className="size-5" />
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift dark:border-white/10 dark:bg-brand-navy-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <p className="truncate text-sm font-semibold">{viewer.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {viewer.businessName ?? viewer.role.toLowerCase()}
            </p>
            {viewer.isRetailer && !viewer.isApprovedRetailer ? (
              <Badge variant="outline" className="mt-2 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                Awaiting approval
              </Badge>
            ) : viewer.isApprovedRetailer ? (
              <Badge className="mt-2 bg-emerald-600">Wholesale access</Badge>
            ) : null}
          </div>

          <div className="p-1.5">
            {viewer.isAdmin || viewer.isEditor ? (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard className="size-4" /> Admin dashboard
              </Link>
            ) : null}
            {viewer.isRetailer ? (
              <Link
                href="/retailer/dashboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <Store className="size-4" /> Retailer dashboard
              </Link>
            ) : null}
            <Link
              href="/wishlist"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              <ShoppingBag className="size-4" /> My wishlist
            </Link>
            <a
              href="/api/auth/logout"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => setOpen(false)}
            >
              <LogOut className="size-4" /> Sign out
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  settings,
  categories,
  viewer,
}: {
  open: boolean;
  onClose: () => void;
  settings: ContactInfo;
  categories: NavCategory[];
  viewer: ViewerSummary | null;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-brand-navy-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white shadow-lift dark:bg-brand-navy-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-white/10">
          <span className="font-display text-base font-extrabold">Menu</span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close menu">
            <X className="size-5" />
          </Button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="default" className="w-full" asChild>
              <Link href={viewer?.isRetailer ? '/retailer/dashboard' : '/retailer/register'}>
                <Store className="size-4" /> {viewer?.isRetailer ? 'Dashboard' : 'Become retailer'}
              </Link>
            </Button>
            <Button variant="whatsapp" className="w-full" asChild>
              <a href={whatsapp.general({ whatsappNumber: settings.whatsappNumber, businessName: settings.businessName })} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
        </div>

        <nav className="flex-1 px-2 pb-6" aria-label="Mobile">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}

          {categories.length > 0 ? (
            <>
              <p className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
              {categories.map((category) => (
                <div key={category.id} className="mt-1">
                  <Link
                    href={`/category/${category.slug}`}
                    onClick={onClose}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    {category.name}
                  </Link>
                  {category.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/category/${child.slug}`}
                      onClick={onClose}
                      className="block py-1.5 pl-6 pr-3 text-sm text-muted-foreground hover:text-brand-blue-600"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ))}
            </>
          ) : null}

          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
            {viewer ? (
              <>
                {viewer.isAdmin || viewer.isEditor ? (
                  <Link href="/admin" onClick={onClose} className="block rounded-lg px-3 py-2.5 text-sm font-medium">
                    Admin dashboard
                  </Link>
                ) : null}
                <a href="/api/auth/logout" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-destructive">
                  Sign out
                </a>
              </>
            ) : (
              <div className="grid gap-2 px-1">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login" onClick={onClose}>
                    Sign in
                  </Link>
                </Button>
                <Button variant="subtle" className="w-full" asChild>
                  <Link href="/register" onClick={onClose}>
                    Create account
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
