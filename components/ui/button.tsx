import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-premium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-brand-blue-600 text-white shadow-soft hover:bg-brand-blue-700 hover:shadow-lift active:bg-brand-blue-800',
        accent:
          'bg-brand-orange-500 text-white shadow-soft hover:bg-brand-orange-600 hover:shadow-glow-orange active:bg-brand-orange-700',
        dark: 'bg-brand-navy-900 text-white shadow-soft hover:bg-brand-navy-800 hover:shadow-lift',
        outline:
          'border border-slate-300 bg-white/80 text-slate-900 backdrop-blur hover:border-brand-blue-400 hover:bg-brand-blue-50 hover:text-brand-blue-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-brand-blue-400/60 dark:hover:bg-white/10',
        secondary: 'bg-brand-blue-50 text-brand-blue-700 hover:bg-brand-blue-100 dark:bg-brand-blue-500/15 dark:text-brand-blue-300 dark:hover:bg-brand-blue-500/25',
        ghost: 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white',
        subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15',
        whatsapp:
          'bg-[#25D366] text-white shadow-soft hover:bg-[#1eb959] hover:shadow-[0_12px_32px_-8px_rgba(37,211,102,0.55)]',
        destructive: 'bg-red-600 text-white shadow-soft hover:bg-red-700',
        success: 'bg-emerald-600 text-white shadow-soft hover:bg-emerald-700',
        link: 'text-brand-blue-600 underline-offset-4 hover:underline dark:text-brand-blue-400',
        gold: 'bg-brand-gold-400 text-brand-navy-950 shadow-soft hover:bg-brand-gold-500',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-md px-3.5 text-[13px]',
        xs: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-13 px-7 text-base',
        xl: 'h-14 px-9 text-base',
        icon: 'size-10',
        'icon-sm': 'size-9',
        'icon-xs': 'size-8',
        full: 'h-11 w-full px-5',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  /** Optional icon rendered after the label. */
  iconRight?: React.ReactNode;
}

const Spinner = () => (
  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, block, asChild = false, loading = false, icon, iconRight, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, block }), className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <Spinner /> : icon}
            {children}
            {!loading && iconRight}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
