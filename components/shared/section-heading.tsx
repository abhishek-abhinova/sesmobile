import Link from 'next/link';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
  invert = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  action?: { href: string; label: string };
  className?: string;
  invert?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? (
          <p
            className={cn(
              'mb-2 text-[11px] font-bold uppercase tracking-[0.2em]',
              invert ? 'text-brand-blue-300' : 'text-brand-blue-600 dark:text-brand-blue-400',
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            'text-2xl font-bold sm:text-3xl',
            invert && 'text-white',
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn('mt-2 text-sm leading-relaxed', invert ? 'text-white/65' : 'text-muted-foreground')}>
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <Link
          href={action.href}
          className={cn(
            'shrink-0 text-sm font-semibold underline-offset-4 hover:underline',
            invert ? 'text-white' : 'text-brand-blue-600 dark:text-brand-blue-400',
          )}
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}
