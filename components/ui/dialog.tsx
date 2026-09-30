'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[90] bg-brand-navy-950/70 backdrop-blur-sm',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: 'sm' | 'default' | 'lg' | 'xl' | 'full' }
>(({ className, children, size = 'default', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-[100] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
        'max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lift',
        'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out',
        'dark:border-white/10 dark:bg-brand-navy-900',
        size === 'sm' && 'max-w-sm',
        size === 'default' && 'max-w-lg',
        size === 'lg' && 'max-w-2xl',
        size === 'xl' && 'max-w-4xl',
        size === 'full' && 'max-w-[min(96rem,95vw)]',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10 dark:hover:text-white">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-5 flex flex-col space-y-1.5 pr-8 text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-xl font-semibold tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/** Bottom-sheet variant used for the mobile filter interface. */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'top' | 'bottom' | 'left' | 'right' }
>(({ className, children, side = 'bottom', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-[100] bg-white shadow-lift data-[state=open]:animate-slide-up-sheet dark:bg-brand-navy-900',
        side === 'bottom' &&
          'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t data-[state=closed]:animate-fade-out',
        side === 'top' && 'inset-x-0 top-0 max-h-[88dvh] rounded-b-3xl border-b',
        side === 'right' &&
          'inset-y-0 right-0 h-full w-[min(24rem,90vw)] border-l data-[state=closed]:animate-fade-out',
        side === 'left' && 'inset-y-0 left-0 h-full w-[min(24rem,90vw)] border-r',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10 dark:text-slate-300">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
SheetContent.displayName = 'SheetContent';

const SheetTitle = DialogTitle;
const SheetDescription = DialogDescription;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  SheetContent,
  SheetTitle,
  SheetDescription,
};
