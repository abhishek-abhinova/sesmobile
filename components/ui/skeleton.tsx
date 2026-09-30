import * as React from 'react';
import { cn } from '@/lib/utils';

/* ==========================================================================
   Skeleton primitives — the site never shows a blank screen while loading.
   ======================================================================== */

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('skeleton', className)} {...props} />;
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: i === lines - 1 ? '62%' : i % 3 === 1 ? '88%' : '100%' }}
        />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-baseline gap-2 pt-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3.5 w-14" />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4', className)}
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading products…</span>
    </div>
  );
}

function CategoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

function CategoryGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)} role="status" aria-label="Loading categories">
      {Array.from({ length: count }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10" role="status" aria-label="Loading table">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" style={{ maxWidth: c === 0 ? 160 : undefined }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-brand-navy-900">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-white/10 dark:bg-brand-navy-900">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-6 h-64 w-full" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-brand-navy-900">
          <Skeleton className="h-5 w-32" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <Skeleton className="h-3.5 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2" role="status" aria-label="Loading product">
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-2/3" />
        <SkeletonText lines={3} />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  ProductCardSkeleton,
  ProductGridSkeleton,
  CategoryCardSkeleton,
  CategoryGridSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  ProductDetailSkeleton,
};
