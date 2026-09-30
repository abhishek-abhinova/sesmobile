'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/* ==========================================================================
   Wishlist
   Works for guests (localStorage + server-side guest session) and for signed-in
   users (persisted to the database). Selecting multiple products then handing
   them to WhatsApp is the primary conversion path for retailers.
   ======================================================================== */

export interface WishlistEntry {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  imageUrl: string | null;
  price: number | null;
  retailerPrice?: number;
  inStock: boolean;
  quantity: number;
}

interface WishlistContextValue {
  items: WishlistEntry[];
  ids: string[];
  count: number;
  ready: boolean;
  isSaved: (productId: string) => boolean;
  toggle: (product: Omit<WishlistEntry, 'quantity'>) => void;
  add: (product: Omit<WishlistEntry, 'quantity'>) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setQuantity: (productId: string, quantity: number) => void;
}

const STORAGE_KEY = 'ses-wishlist-v1';
const GUEST_HEADER = 'x-guest-id';

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readGuestId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem('ses-guest-id');
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem('ses-guest-id', id);
    return id;
  } catch {
    return '';
  }
}

function readLocal(): WishlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WishlistEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: WishlistEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage may be full or blocked — wishlist still works in-memory */
  }
}

export function WishlistProvider({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from local storage immediately (guest experience).
  useEffect(() => {
    setItems(readLocal());
    setReady(true);
  }, []);

  // Signed-in users: the database is the source of truth.
  useEffect(() => {
    if (!isAuthenticated || !ready) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch('/api/wishlist', { headers: { [GUEST_HEADER]: readGuestId() } });
        if (!res.ok) return;
        const json = (await res.json()) as { ok: boolean; data: WishlistEntry[] };
        if (!cancelled && json.ok) {
          setItems(json.data);
          writeLocal(json.data);
        }
      } catch {
        /* fall back to local state */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready]);

  const add = useCallback(
    (product: Omit<WishlistEntry, 'quantity'>) => {
      setItems((current) => {
        if (current.some((i) => i.productId === product.productId)) return current;
        const next = [...current, { ...product, quantity: 1 }];
        writeLocal(next);
        if (isAuthenticated) syncAdd(product.productId);
        return next;
      });
      toast.success('Saved to wishlist', { description: product.name });
    },
    [isAuthenticated],
  );

  const remove = useCallback(
    (productId: string) => {
      setItems((current) => {
        const next = current.filter((i) => i.productId !== productId);
        writeLocal(next);
        if (isAuthenticated) {
          void fetch('/api/wishlist', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', [GUEST_HEADER]: readGuestId() },
            body: JSON.stringify({ productIds: [productId] }),
          }).catch(() => undefined);
        }
        return next;
      });
    },
    [isAuthenticated],
  );

  const toggle = useCallback(
    (product: Omit<WishlistEntry, 'quantity'>) => {
      const exists = items.some((i) => i.productId === product.productId);
      if (exists) {
        remove(product.productId);
        toast('Removed from wishlist', { description: product.name });
      } else {
        add(product);
      }
    },
    [items, add, remove],
  );

  const clear = useCallback(() => {
    setItems([]);
    writeLocal([]);
    if (isAuthenticated) {
      void fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', [GUEST_HEADER]: readGuestId() },
        body: JSON.stringify({ productIds: items.map((i) => i.productId) }),
      }).catch(() => undefined);
    }
  }, [items, isAuthenticated]);

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      setItems((current) =>
        current.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(9999, quantity)) } : i)),
      );
      const next = items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
      writeLocal(next);
    },
    [items],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      ids: items.map((i) => i.productId),
      count: items.length,
      ready,
      isSaved: (id: string) => items.some((i) => i.productId === id),
      toggle,
      add,
      remove,
      clear,
      setQuantity,
    }),
    [items, ready, toggle, add, remove, clear, setQuantity],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

function syncAdd(productId: string) {
  void fetch('/api/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  }).catch(() => undefined);
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>.');
  return ctx;
}
