'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/providers/toaster';
import { WishlistProvider } from '@/components/providers/wishlist-provider';

export function AppProviders({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  return (
    <ThemeProvider>
      <WishlistProvider isAuthenticated={isAuthenticated}>
        {children}
        <Toaster />
      </WishlistProvider>
    </ThemeProvider>
  );
}
