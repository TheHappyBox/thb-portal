import type { ProductVariant } from "@/types/catalog";

/**
 * Money + variant helpers, kept in one place so the catalog grid and the product
 * detail page format and label prices identically. Prices are whole cents (CAD).
 */

/**
 * Format whole cents as a price string, e.g. 9900 -> "$99", 4999 -> "$49.99".
 * Drops the ".00" for round dollar amounts to keep the catalog clean.
 */
export function formatPrice(cents: number, currency = "CAD"): string {
  const dollars = cents / 100;
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(dollars);
}

/** Variants ordered the way they should appear (Happy before Extra Happy). */
export function sortedVariants(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort((a, b) => a.sort_order - b.sort_order);
}

/** The default (pre-selected) size, falling back to the lowest-priced one. */
export function defaultVariant(
  variants: ProductVariant[],
): ProductVariant | undefined {
  if (variants.length === 0) return undefined;
  return (
    variants.find((v) => v.is_default) ??
    [...variants].sort((a, b) => a.price_cents - b.price_cents)[0]
  );
}

/**
 * The price label for a product card:
 *  - multiple sizes -> "From $99" (the lowest size price)
 *  - single size    -> the flat price, e.g. "$69"
 */
export function priceLabel(variants: ProductVariant[]): string {
  if (variants.length === 0) return "—";
  const lowest = Math.min(...variants.map((v) => v.price_cents));
  const currency = variants[0]?.currency ?? "CAD";
  const price = formatPrice(lowest, currency);
  return variants.length > 1 ? `From ${price}` : price;
}
