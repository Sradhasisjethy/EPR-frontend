import { useAllProducts } from '@/hooks/use-products';
import { formatINR, toPaise } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * What the product normally sells for, beside the rate being typed.
 *
 * A rate is per unit, and a figure typed in the wrong unit is invisible until
 * the invoice is raised: ₹4,50,000 and ₹4,500 look alike in a narrow box, and
 * one of them makes a ₹63,720 order into a ₹53,20,620 one. Showing the list
 * price, and saying so plainly when the typed rate is an order of magnitude
 * away from it, catches that where it happens.
 *
 * A warning, never a block: selling well above list is a real thing, and the
 * price list is a guide rather than a rule.
 */
export function RateSanityHint({ productId, rateRupees }) {
  const { data } = useAllProducts({ status: 'active' }, { enabled: !!productId });
  const product = (data?.rows || []).find((p) => p.id === productId);
  const listPaise = Number(product?.sellingPricePaise || 0);
  if (!productId || !listPaise) return null;

  const typedPaise = rateRupees === '' || rateRupees === undefined ? null : toPaise(rateRupees);
  const wildlyOff = typedPaise !== null && typedPaise > 0 && (typedPaise >= listPaise * 10 || typedPaise * 10 <= listPaise);

  return (
    <p className={cn('text-xs', wildlyOff ? 'text-amber-600' : 'text-muted-foreground')}>
      {wildlyOff
        ? `That is ${Math.round(typedPaise >= listPaise ? typedPaise / listPaise : listPaise / typedPaise)}× the usual price of ${formatINR(listPaise)} each — check the rate is per unit.`
        : `Usually ${formatINR(listPaise)} each`}
    </p>
  );
}
