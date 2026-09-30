'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
    tone?: 'default' | 'success' | 'warning' | 'destructive' | 'accent';
  }
>(({ className, value, indicatorClassName, tone = 'default', ...props }, ref) => {
  const tones: Record<string, string> = {
    default: 'bg-brand-blue-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    destructive: 'bg-red-600',
    accent: 'bg-brand-orange-500',
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full w-full flex-1 rounded-full transition-transform duration-500 ease-premium', tones[tone], indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
