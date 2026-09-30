'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import { useTheme } from 'next-themes';

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme as ToasterProps['theme']}
      position="top-center"
      richColors
      closeButton
      duration={4200}
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border shadow-lift',
          description: 'text-muted-foreground',
          actionButton: 'bg-brand-blue-600 text-white',
          cancelButton: 'bg-slate-100 text-slate-700',
        },
      }}
      style={{ '--normal-bg': undefined, '--normal-text': undefined } as React.CSSProperties}
      {...props}
    />
  );
}
