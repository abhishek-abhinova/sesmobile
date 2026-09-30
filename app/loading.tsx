export default function Loading() {
  return (
    <div className="container py-10">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100 dark:bg-white/5" />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-square animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-white/[0.04]" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-white/[0.04]" />
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading…
      </span>
    </div>
  );
}
