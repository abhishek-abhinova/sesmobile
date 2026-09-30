'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ProductFormValues {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  mrp: string;
  customerPrice: string;
  retailerPrice: string;
  costPrice: string;
  discountType: string;
  discountValue: string;
  showMrp: boolean;
  showCustomerPrice: boolean;
  showRetailerPrice: boolean;
  showDiscount: boolean;
  brandId: string;
  categoryId: string;
  subcategoryId: string;
  supportedModels: string;
  status: string;
  stockStatus: string;
  stockQuantity: string;
  lowStockThreshold: string;
  minimumOrderQty: string;
  minimumWholesaleQty: string;
  wholesaleOnly: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isWholesaleDeal: boolean;
  badge: string;
  position: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
}

interface Option {
  id: string;
  name: string;
}

export function ProductEditForm({
  values,
  categories,
  brands,
}: {
  values: ProductFormValues;
  categories: Array<Option & { parentId: string | null }>;
  brands: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(values);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const subcategories = categories.filter((category) => category.parentId === form.categoryId);
  const parentId = categories.find((c) => c.id === form.categoryId)?.parentId ?? null;
  const possibleParents = categories.filter((c) => c.parentId === null && c.id !== form.categoryId);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function num(value: string): number | null {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          sku: form.sku.trim(),
          shortDescription: form.shortDescription.trim() || null,
          description: form.description.trim() || null,
          mrp: num(form.mrp),
          customerPrice: num(form.customerPrice),
          retailerPrice: num(form.retailerPrice),
          costPrice: num(form.costPrice),
          showMrp: form.showMrp,
          showCustomerPrice: form.showCustomerPrice,
          showRetailerPrice: form.showRetailerPrice,
          showDiscount: form.showDiscount,
          discountType: form.discountType,
          discountValue: num(form.discountValue),
          brandId: form.brandId || null,
          categoryId: form.categoryId || null,
          subcategoryId: form.subcategoryId || null,
          supportedModels: form.supportedModels
            .split(',')
            .map((model) => model.trim())
            .filter(Boolean),
          status: form.status,
          stockStatus: form.stockStatus,
          stockQuantity: Number(form.stockQuantity || 0),
          lowStockThreshold: Number(form.lowStockThreshold || 0),
          minimumOrderQty: Number(form.minimumOrderQty || 1),
          minimumWholesaleQty: Number(form.minimumWholesaleQty || 1),
          wholesaleOnly: form.wholesaleOnly,
          isFeatured: form.isFeatured,
          isBestSeller: form.isBestSeller,
          isNewArrival: form.isNewArrival,
          isWholesaleDeal: form.isWholesaleDeal,
          badge: form.badge.trim() || null,
          position: Number(form.position || 0),
          seoTitle: form.seoTitle.trim() || null,
          seoDescription: form.seoDescription.trim() || null,
          seoKeywords: form.seoKeywords.trim() || null,
          ogImageUrl: form.ogImageUrl.trim() || null,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; data?: { slug?: string } }
        | { ok: false; error?: { message?: string; fieldErrors?: Record<string, string[]> } }
        | null;

      if (!res.ok || !json?.ok) {
        const failure = json && !json.ok ? json.error : undefined;
        toast.error(failure?.message ?? 'Could not save the product.');
        return;
      }

      toast.success('Product saved');
      if (json.data?.slug && json.data.slug !== form.slug) set('slug', json.data.slug);
      router.refresh();
    } catch {
      toast.error('Could not save the product.');
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    const confirmed = window.confirm('Delete this product? This cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/products?id=${form.id}`, { method: 'DELETE' });
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: { message?: string } } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json && !json.ok ? (json.error?.message ?? 'Could not delete.') : 'Could not delete.');
        setDeleting(false);
        return;
      }
      toast.success('Product deleted');
      router.push('/admin/products');
      router.refresh();
    } catch {
      toast.error('Could not delete the product.');
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Panel title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Product name" id="p-name" required>
                <Input id="p-name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </Field>
            </div>

            <Field label="SKU" id="p-sku" required>
              <Input id="p-sku" value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} required />
            </Field>

            <Field label="URL slug" id="p-slug" hint="Leave blank to generate from the name">
              <Input id="p-slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Short description" id="p-short">
                <Input
                  id="p-short"
                  value={form.shortDescription}
                  onChange={(e) => set('shortDescription', e.target.value)}
                  maxLength={300}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Full description" id="p-desc" hint="Supports basic HTML from the editor">
                <Textarea
                  id="p-desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={8}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Supported models"
                id="p-models"
                hint="Comma separated, e.g. Samsung Galaxy S21, S21 FE"
              >
                <Input
                  id="p-models"
                  value={form.supportedModels}
                  onChange={(e) => set('supportedModels', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="Pricing" description="Cost price is never shown on the public site.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="MRP (₹)" id="p-mrp">
              <Input id="p-mrp" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Customer price (₹)" id="p-customer">
              <Input
                id="p-customer"
                value={form.customerPrice}
                onChange={(e) => set('customerPrice', e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="Dealer price (₹)" id="p-retailer">
              <Input
                id="p-retailer"
                value={form.retailerPrice}
                onChange={(e) => set('retailerPrice', e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="Cost price (₹)" id="p-cost" hint="Admin only">
              <Input
                id="p-cost"
                value={form.costPrice}
                onChange={(e) => set('costPrice', e.target.value)}
                inputMode="decimal"
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Discount type" id="p-discount-type">
              <Select value={form.discountType} onValueChange={(value) => set('discountType', value)}>
                <SelectTrigger id="p-discount-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Discount value" id="p-discount-value">
              <Input
                id="p-discount-value"
                value={form.discountValue}
                onChange={(e) => set('discountValue', e.target.value)}
                inputMode="decimal"
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Toggle label="Show MRP" checked={form.showMrp} onChange={(v) => set('showMrp', v)} />
            <Toggle label="Show customer price" checked={form.showCustomerPrice} onChange={(v) => set('showCustomerPrice', v)} />
            <Toggle label="Show dealer price to approved retailers" checked={form.showRetailerPrice} onChange={(v) => set('showRetailerPrice', v)} />
            <Toggle label="Show discount badge" checked={form.showDiscount} onChange={(v) => set('showDiscount', v)} />
          </div>
        </Panel>

        <Panel title="Search engine listing">
          <div className="grid gap-4">
            <Field label="SEO title" id="p-seo-title" hint={`${form.seoTitle.length}/60 characters`}>
              <Input id="p-seo-title" value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} maxLength={70} />
            </Field>
            <Field label="Meta description" id="p-seo-desc" hint={`${form.seoDescription.length}/160 characters`}>
              <Textarea id="p-seo-desc" value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} rows={3} maxLength={200} />
            </Field>
            <Field label="Keywords" id="p-seo-keywords" hint="Comma separated">
              <Input id="p-seo-keywords" value={form.seoKeywords} onChange={(e) => set('seoKeywords', e.target.value)} />
            </Field>
            <Field label="Social share image URL" id="p-og">
              <Input id="p-og" value={form.ogImageUrl} onChange={(e) => set('ogImageUrl', e.target.value)} />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Visibility">
          <div className="space-y-4">
            <Field label="Status" id="p-status">
              <Select value={form.status} onValueChange={(value) => set('status', value)}>
                <SelectTrigger id="p-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active — visible on the site</SelectItem>
                  <SelectItem value="DRAFT">Draft — hidden</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-3">
              <Toggle label="Featured on home page" checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
              <Toggle label="Best seller" checked={form.isBestSeller} onChange={(v) => set('isBestSeller', v)} />
              <Toggle label="New arrival" checked={form.isNewArrival} onChange={(v) => set('isNewArrival', v)} />
              <Toggle label="Wholesale deal" checked={form.isWholesaleDeal} onChange={(v) => set('isWholesaleDeal', v)} />
              <Toggle label="Wholesale only" checked={form.wholesaleOnly} onChange={(v) => set('wholesaleOnly', v)} />
            </div>

            <Field label="Badge" id="p-badge" hint="e.g. NEW, BEST SELLER, LIMITED STOCK">
              <Input id="p-badge" value={form.badge} onChange={(e) => set('badge', e.target.value)} maxLength={40} />
            </Field>

            <Field label="Sort position" id="p-position" hint="Lower numbers appear first">
              <Input id="p-position" value={form.position} onChange={(e) => set('position', e.target.value)} inputMode="numeric" />
            </Field>
          </div>
        </Panel>

        <Panel title="Organisation">
          <div className="space-y-4">
            <Field label="Parent category" id="p-category">
              <Select
                value={form.categoryId || 'none'}
                onValueChange={(value) => {
                  set('categoryId', value === 'none' ? '' : value);
                  set('subcategoryId', '');
                }}
              >
                <SelectTrigger id="p-category">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {possibleParents.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  {parentId ? (
                    <SelectItem value={parentId} disabled>
                      {categories.find((c) => c.id === parentId)?.name} (current)
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Subcategory" id="p-subcategory">
              <Select
                value={form.subcategoryId || 'none'}
                onValueChange={(value) => set('subcategoryId', value === 'none' ? '' : value)}
              >
                <SelectTrigger id="p-subcategory">
                  <SelectValue placeholder="No subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subcategory</SelectItem>
                  {subcategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Brand" id="p-brand">
              <Select value={form.brandId || 'none'} onValueChange={(value) => set('brandId', value === 'none' ? '' : value)}>
                <SelectTrigger id="p-brand">
                  <SelectValue placeholder="No brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No brand</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title="Stock &amp; ordering">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stock status" id="p-stock-status">
              <Select value={form.stockStatus} onValueChange={(value) => set('stockStatus', value)}>
                <SelectTrigger id="p-stock-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_STOCK">In stock</SelectItem>
                  <SelectItem value="LOW_STOCK">Low stock</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
                  <SelectItem value="COMING_SOON">Coming soon</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Stock quantity" id="p-stock-qty">
              <Input id="p-stock-qty" value={form.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} inputMode="numeric" />
            </Field>

            <Field label="Low stock threshold" id="p-low-stock">
              <Input id="p-low-stock" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} inputMode="numeric" />
            </Field>

            <Field label="Minimum order qty" id="p-moq">
              <Input id="p-moq" value={form.minimumOrderQty} onChange={(e) => set('minimumOrderQty', e.target.value)} inputMode="numeric" />
            </Field>

            <Field label="Minimum wholesale qty" id="p-moq-wholesale">
              <Input
                id="p-moq-wholesale"
                value={form.minimumWholesaleQty}
                onChange={(e) => set('minimumWholesaleQty', e.target.value)}
                inputMode="numeric"
              />
            </Field>
          </div>
        </Panel>

        <div className="sticky bottom-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-lift dark:border-white/10 dark:bg-brand-navy-900">
          <Button type="submit" block loading={pending} icon={<Save className="size-4" />}>
            Save changes
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" block asChild>
              <Link href={`/product/${form.slug}`} target="_blank">
                <ExternalLink className="mr-1.5 size-3.5" />
                View
              </Link>
            </Button>
            <Button type="button" variant="outline" block loading={deleting} onClick={remove}>
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  id,
  hint,
  required,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-brand-orange-500">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
