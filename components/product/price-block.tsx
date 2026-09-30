import { formatCurrency } from '@/lib/format';
import type { PublicPriceBlock } from '@/lib/pricing';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Renders a price block that has already been filtered server-side.
 *
 * This component never sees cost price or retailer price unless the server
 * decided the viewer is entitled to them — the fields are simply absent
 * otherwise, so there is nothing to hide here.
 */
export function PriceBlock({
  price,
  currencySymbol = '₹',
  className,
  size = 'default',
  showTier = true,
}: {
  price: PublicPriceBlock;
  currencySymbol?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showTier?: boolean;
}) {
  const { effectivePrice, mrp, discountPercent, showMrp, showDiscount, tier } = price;
  const hasDiscount = showDiscount && showMrp && mrp != null && effectivePrice != null && mrp > effectivePrice;

  if (effectivePrice == null) {
    return (
      <p className={cn('font-semibold text-muted-foreground', size === 'lg' ? 'text-lg' : 'text-sm', className)}>
        Price on request
      </p>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
      <span
        className={cn(
          'font-display font-extrabold tracking-tight text-brand-navy-900 dark:text-white',
          size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl',
        )}
      >
        {formatCurrency(effectivePrice, { symbol: currencySymbol })}
      </span>

      {hasDiscount ? (
        <>
          <span className={cn('text-muted-foreground line-through', size === 'lg' ? 'text-base' : 'text-sm')}>
            {formatCurrency(mrp, { symbol: currencySymbol })}
          </span>
          {discountPercent > 0 ? (
            <Badge className="bg-emerald-600">{Math.round(discountPercent)}% off</Badge>
          ) : null}
        </>
      ) : null}

      {showTier && tier === 'wholesale' ? (
        <Badge className="bg-brand-navy-900 dark:bg-brand-blue-600">Wholesale price</Badge>
      ) : null}
    </div>
  );
}
