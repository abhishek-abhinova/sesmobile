import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string } | React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-white text-brand-blue-600 shadow-soft dark:bg-white/5">
          <Icon className="size-6" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        typeof action === 'object' && 'href' in action ? (
          <a
            href={action.href}
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-blue-700"
          >
            {action.label}
          </a>
        ) : (
          <div className="mt-5">{action}</div>
        )
      ) : null}
    </div>
  );
}
