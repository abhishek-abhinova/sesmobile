'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/dialog';
import { CategoryIcon } from '@/components/shared/category-icon';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

export interface FacetBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  count: number;
}

export interface FacetCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  count: number;
}

export interface ProductFacets {
  brands: FacetBrand[];
  categories: FacetCategory[];
  models: string[];
  priceMin: number;
  priceMax: number;
}

const SORT_VALUES = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'featured', label: 'Featured' },
  { value: 'name-asc', label: 'Name: A to Z' },
] as const;

function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.getAll(key).flatMap((value) => value.split(','));
  return [...new Set(raw.map((v) => v.trim()).filter(Boolean))];
}

export function ProductFilters({
  facets,
  total,
  currencySymbol = '₹',
}: {
  facets: ProductFacets;
  total: number;
  currencySymbol?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const selectedBrands = useMemo(() => readList(params, 'brand'), [params]);
  const selectedCategories = useMemo(() => readList(params, 'category'), [params]);
  const selectedModels = useMemo(() => readList(params, 'model'), [params]);
  const availability = params.get('availability') ?? 'all';
  const sort = params.get('sort') ?? 'relevance';
  const [minPrice, setMinPrice] = useState(Number(params.get('minPrice') ?? ''));
  const [maxPrice, setMaxPrice] = useState(Number(params.get('maxPrice') ?? ''));

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, opts?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      if (opts?.resetPage !== false) next.delete('page');
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const toggleMulti = (key: string, value: string) => {
    update((next) => {
      const current = readList(next, key);
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      next.delete(key);
      for (const item of updated) next.append(key, item);
      if (updated.length === 0) next.delete(key);
    });
  };

  const activeChips = [
    ...selectedCategories.map((slug) => ({
      key: `category:${slug}`,
      label: facets.categories.find((c) => c.slug === slug)?.name ?? slug,
      remove: () => toggleMulti('category', slug),
    })),
    ...selectedBrands.map((slug) => ({
      key: `brand:${slug}`,
      label: facets.brands.find((b) => b.slug === slug)?.name ?? slug,
      remove: () => toggleMulti('brand', slug),
    })),
    ...selectedModels.map((model) => ({
      key: `model:${model}`,
      label: model,
      remove: () => toggleMulti('model', model),
    })),
    ...(availability !== 'all'
      ? [
          {
            key: 'availability',
            label: availability === 'in-stock' ? 'In stock' : 'Out of stock',
            remove: () => update((next) => next.delete('availability')),
          },
        ]
      : []),
    ...(params.get('onSale') === 'true'
      ? [{ key: 'onSale', label: 'On sale', remove: () => update((next) => next.delete('onSale')) }]
      : []),
  ];

  const filterBody = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Availability</h3>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All products' },
            { value: 'in-stock', label: 'In stock only' },
            { value: 'out-of-stock', label: 'Out of stock' },
          ].map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="availability"
                checked={availability === option.value}
                onChange={() =>
                  update((next) => {
                    if (option.value === 'all') next.delete('availability');
                    else next.set('availability', option.value);
                  })
                }
                className="size-4 accent-brand-blue-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {facets.categories.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Category</h3>
          <div className="space-y-2">
            {facets.categories.map((category) => (
              <label key={category.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={selectedCategories.includes(category.slug)}
                  onCheckedChange={() => toggleMulti('category', category.slug)}
                />
                <CategoryIcon name={category.icon} size={16} className="text-muted-foreground" />
                <span className="flex-1">{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.count}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {facets.brands.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Brand</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {facets.brands.map((brand) => (
              <label key={brand.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={selectedBrands.includes(brand.slug)}
                  onCheckedChange={() => toggleMulti('brand', brand.slug)}
                />
                <span className="flex-1 truncate">{brand.name}</span>
                <span className="text-xs text-muted-foreground">{brand.count}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Price range</h3>
        <Slider
          value={[minPrice || facets.priceMin, maxPrice || facets.priceMax]}
          min={facets.priceMin}
          max={facets.priceMax}
          step={10}
          onValueChange={(values) => {
            setMinPrice(values[0] ?? facets.priceMin);
            setMaxPrice(values[1] ?? facets.priceMax);
          }}
          onValueCommit={(values) => {
            const low = values[0] ?? facets.priceMin;
            const high = values[1] ?? facets.priceMax;
            update((next) => {
              if (low <= facets.priceMin) next.delete('minPrice');
              else next.set('minPrice', String(low));
              if (high >= facets.priceMax) next.delete('maxPrice');
              else next.set('maxPrice', String(high));
            });
          }}
          aria-label="Price range"
        />
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Input
            type="number"
            min={0}
            value={minPrice || ''}
            placeholder={String(facets.priceMin)}
            onChange={(e) => setMinPrice(Number(e.target.value))}
            onBlur={() =>
              update((next) => {
                if (!minPrice) next.delete('minPrice');
                else next.set('minPrice', String(minPrice));
              })
            }
            className="h-9"
            aria-label="Minimum price"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            min={0}
            value={maxPrice || ''}
            placeholder={String(facets.priceMax)}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            onBlur={() =>
              update((next) => {
                if (!maxPrice) next.delete('maxPrice');
                else next.set('maxPrice', String(maxPrice));
              })
            }
            className="h-9"
            aria-label="Maximum price"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {formatCurrency(facets.priceMin, { symbol: currencySymbol })} – {formatCurrency(facets.priceMax, { symbol: currencySymbol })}
        </p>
      </div>

      {facets.models.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Supported model</h3>
          <div className="flex flex-wrap gap-2">
            {facets.models.slice(0, 28).map((model) => {
              const active = selectedModels.includes(model);
              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => toggleMulti('model', model)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    active
                      ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-500/15 dark:text-brand-blue-300'
                      : 'border-slate-200 text-muted-foreground hover:border-brand-blue-300 dark:border-white/10',
                  )}
                >
                  {model}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Offers</h3>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={params.get('onSale') === 'true'}
            onCheckedChange={(checked) =>
              update((next) => {
                if (checked) next.set('onSale', 'true');
                else next.delete('onSale');
              })
            }
          />
          On sale only
        </label>
      </div>

      {activeChips.length > 0 ? (
        <Button
          variant="outline"
          size="sm"
          block
          onClick={() =>
            update((next) => {
              for (const key of ['category', 'brand', 'model', 'availability', 'onSale', 'minPrice', 'maxPrice']) {
                next.delete(key);
              }
            })
          }
          icon={<RotateCcw className="size-3.5" />}
        >
          Clear all filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setOpen(true)}
          icon={<SlidersHorizontal className="size-4" />}
        >
          Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
        </Button>

        <p className={cn('text-sm text-muted-foreground', pending && 'opacity-60')}>
          {total} {total === 1 ? 'product' : 'products'}
        </p>

        <div className="ml-auto w-52">
          <Select
            value={sort}
            onValueChange={(value) =>
              update((next) => {
                if (value === 'relevance') next.delete('sort');
                else next.set('sort', value);
              })
            }
          >
            <SelectTrigger aria-label="Sort products" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_VALUES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.remove}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:bg-white/5"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="hidden lg:block">
        <aside className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold">
            <SlidersHorizontal className="size-4" />
            Filters
          </div>
          {filterBody}
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto p-5">
          <div className="mb-4 pr-8">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription className="mt-1">Narrow down the catalogue.</SheetDescription>
          </div>
          {filterBody}
          <Button block className="mt-5" onClick={() => setOpen(false)} icon={<Check className="size-4" />}>
            Show {total} results
          </Button>
        </SheetContent>
      </Dialog>
    </>
  );
}
