import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-blue-600 text-white',
        accent: 'border-transparent bg-brand-orange-500 text-white',
        success: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
        destructive: 'border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
        info: 'border-transparent bg-brand-blue-100 text-brand-blue-800 dark:bg-brand-blue-500/20 dark:text-brand-blue-300',
        gold: 'border-transparent bg-brand-gold-400/20 text-brand-gold-600 dark:text-brand-gold-300',
        outline: 'border-slate-300 bg-white text-slate-700 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200',
        muted: 'border-transparent bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
        new: 'border-transparent bg-gradient-to-r from-brand-blue-600 to-brand-blue-400 text-white',
        best: 'border-transparent bg-gradient-to-r from-amber-500 to-brand-orange-500 text-white',
        featured: 'border-transparent bg-gradient-to-r from-brand-navy-900 to-brand-blue-700 text-white',
        wholesale: 'border-transparent bg-gradient-to-r from-emerald-600 to-teal-500 text-white',
        demo: 'border-dashed border-slate-400 bg-transparent text-slate-500 dark:text-slate-400',
      },
      size: {
        default: 'px-2.5 py-0.5 text-[11px]',
        sm: 'px-2 py-0 text-[10px]',
        lg: 'px-3.5 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
