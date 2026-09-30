import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { toPaislessNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ProductEditForm, type ProductFormValues } from '@/components/admin/product-edit-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        shortDescription: true,
        description: true,
        mrp: true,
        customerPrice: true,
        retailerPrice: true,
        costPrice: true,
        discountType: true,
        discountValue: true,
        showMrp: true,
        showCustomerPrice: true,
        showRetailerPrice: true,
        showDiscount: true,
        brandId: true,
        categoryId: true,
        subcategoryId: true,
        supportedModels: true,
        status: true,
        stockStatus: true,
        stockQuantity: true,
        lowStockThreshold: true,
        minimumOrderQty: true,
        minimumWholesaleQty: true,
        wholesaleOnly: true,
        isFeatured: true,
        isBestSeller: true,
        isNewArrival: true,
        isWholesaleDeal: true,
        badge: true,
        position: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
        ogImageUrl: true,
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, parentId: true },
    }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  const values: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription ?? '',
    description: product.description ?? '',
    mrp: toPaislessNumber(product.mrp)?.toString() ?? '',
    customerPrice: toPaislessNumber(product.customerPrice)?.toString() ?? '',
    retailerPrice: toPaislessNumber(product.retailerPrice)?.toString() ?? '',
    costPrice: toPaislessNumber(product.costPrice)?.toString() ?? '',
    discountType: product.discountType,
    discountValue: toPaislessNumber(product.discountValue)?.toString() ?? '',
    showMrp: product.showMrp,
    showCustomerPrice: product.showCustomerPrice,
    showRetailerPrice: product.showRetailerPrice,
    showDiscount: product.showDiscount,
    brandId: product.brandId ?? '',
    categoryId: product.categoryId ?? '',
    subcategoryId: product.subcategoryId ?? '',
    supportedModels: product.supportedModels.join(', '),
    status: product.status,
    stockStatus: product.stockStatus,
    stockQuantity: String(product.stockQuantity),
    lowStockThreshold: String(product.lowStockThreshold),
    minimumOrderQty: String(product.minimumOrderQty),
    minimumWholesaleQty: String(product.minimumWholesaleQty),
    wholesaleOnly: product.wholesaleOnly,
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    isWholesaleDeal: product.isWholesaleDeal,
    badge: product.badge ?? '',
    position: String(product.position),
    seoTitle: product.seoTitle ?? '',
    seoDescription: product.seoDescription ?? '',
    seoKeywords: product.seoKeywords ?? '',
    ogImageUrl: product.ogImageUrl ?? '',
  };

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/products">
            <ArrowLeft className="mr-1.5 size-4" />
            All products
          </Link>
        </Button>
        <h1 className="mt-2 font-display text-2xl font-bold">Edit product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {product.sku} · changes go live on the site as soon as you save.
        </p>
      </div>

      <ProductEditForm values={values} categories={categories} brands={brands} />
    </div>
  );
}
