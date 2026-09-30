'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';

interface Suggestion {
  type: 'product' | 'category' | 'brand' | 'model';
  label: string;
  sublabel?: string;
  href: string;
  price?: number | null;
  imageUrl?: string | null;
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      // Focus after the dialog paints.
      const id = setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(id);
        document.body.style.overflow = '';
      };
    }
    setResults([]);
    setTerm('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all&limit=8`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { ok: boolean; data: { suggestions?: Suggestion[] } };
        setResults(json.ok ? (json.data.suggestions ?? []) : []);
      } catch {
        /* aborted or offline — keep the previous results */
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [term, open]);

  if (!open) return null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    onClose();
    router.push(`/products?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close search" className="absolute inset-0 bg-brand-navy-950/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mx-auto mt-[8vh] w-[94%] max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift dark:border-white/10 dark:bg-brand-navy-900">
        <form onSubmit={submit} className="flex items-center gap-2 border-b border-slate-200 px-4 dark:border-white/10">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search products, brands or phone models…"
            className="h-14 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
            autoComplete="off"
            enterKeyHint="search"
          />
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close search">
            <X className="size-4" />
          </Button>
        </form>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            term.trim().length >= 2 && !loading ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No matches for “{term.trim()}”.
                <button
                  type="button"
                  className="mt-2 block w-full text-center text-sm font-semibold text-brand-blue-600 hover:underline"
                  onClick={() => {
                    onClose();
                    router.push(`/contact?subject=${encodeURIComponent(term.trim())}`);
                  }}
                >
                  Ask us for this product on WhatsApp
                </button>
              </p>
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Start typing to search the catalogue.
              </div>
            )
          ) : (
            <ul>
              {results.map((item) => (
                <li key={`${item.type}-${item.href}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(item.href);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="size-11 shrink-0 rounded-md object-contain" />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-blue-50 text-[10px] font-bold uppercase text-brand-blue-700 dark:bg-white/5 dark:text-brand-blue-300">
                        {item.type.slice(0, 2)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {item.sublabel ? (
                        <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span>
                      ) : null}
                    </span>
                    {item.price != null ? (
                      <span className="shrink-0 text-sm font-semibold">{formatCurrency(item.price)}</span>
                    ) : null}
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
