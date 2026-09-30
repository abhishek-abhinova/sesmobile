'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-[18px] shrink-0 rounded-[5px] border-2 border-slate-300 transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-brand-blue-600 data-[state=checked]:bg-brand-blue-600 data-[state=checked]:text-white',
      'data-[state=indeterminate]:border-brand-blue-600 data-[state=indeterminate]:bg-brand-blue-600 data-[state=indeterminate]:text-white',
      'dark:border-white/25 dark:data-[state=checked]:border-brand-blue-500 dark:data-[state=checked]:bg-brand-blue-500',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === 'indeterminate' ? <Minus className="size-3.5" /> : <Check className="size-3.5" strokeWidth={3} />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
