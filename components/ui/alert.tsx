import * as React from 'react';
import { cn } from '@/lib/utils';

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive' | 'gold';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const styles: Record<string, string> = {
    default: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100',
    info: 'border-brand-blue-200 bg-brand-blue-50 text-brand-blue-900 dark:border-brand-blue-500/25 dark:bg-brand-blue-500/10 dark:text-brand-blue-100',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100',
    warning:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100',
    destructive:
      'border-red-200 bg-red-50 text-red-900 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100',
    gold: 'border-brand-gold-300 bg-brand-gold-400/10 text-brand-navy-900 dark:border-brand-gold-500/30 dark:bg-brand-gold-500/10 dark:text-brand-gold-200',
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={cn('relative w-full rounded-xl border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7', styles[variant], className)}
      {...props}
    />
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm leading-relaxed opacity-90', className)} {...props} />
  ),
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
