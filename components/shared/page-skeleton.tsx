export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-4 w-full max-w-sm animate-pulse rounded bg-slate-100 dark:bg-white/5" />
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
    </div>
  );
}
