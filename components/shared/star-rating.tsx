'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = { sm: 'size-3.5', md: 'size-4', lg: 'size-6' } as const;

export function StarRating({
  rating,
  size = 'md',
  className,
  showValue = false,
  count,
}: {
  rating: number;
  size?: keyof typeof SIZES;
  className?: string;
  showValue?: boolean;
  count?: number;
}) {
  const safeRating = Math.min(5, Math.max(0, rating));
  const starClass = SIZES[size];

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <span className="flex items-center gap-px" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            className={cn(
              starClass,
              value <= Math.round(safeRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600',
            )}
          />
        ))}
      </span>
      <span className="sr-only">{safeRating} out of 5 stars</span>
      {showValue ? (
        <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
          {safeRating.toFixed(1)}
          {count !== undefined ? ` (${count})` : ''}
        </span>
      ) : null}
    </span>
  );
}

/** Interactive star input used by the review form. */
export function StarInput({
  value,
  onChange,
  className,
  name,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  name: string;
}) {
  const labels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  return (
    <div className={cn('flex items-center gap-1', className)} role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? '' : 's'} — ${labels[star - 1]}`}
            name={name}
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500"
          >
            <Star
              className={cn(
                'size-7 transition',
                active ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300 dark:text-slate-600',
              )}
            />
          </button>
        );
      })}
      {value > 0 ? <span className="ml-1.5 text-xs font-medium text-muted-foreground">{labels[value - 1]}</span> : null}
    </div>
  );
}
