import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors',
        'placeholder:text-slate-400 focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus-visible:ring-red-500/25',
        'dark:border-white/12 dark:bg-white/[0.04] dark:placeholder:text-slate-500',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[110px] w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors',
        'placeholder:text-slate-400 focus-visible:border-brand-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/25',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-red-400',
        'dark:border-white/12 dark:bg-white/[0.04] dark:placeholder:text-slate-500',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Input, Textarea };
