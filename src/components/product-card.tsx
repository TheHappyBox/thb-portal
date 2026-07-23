"use client";

import type { ProductWithRelations } from "@/types/catalog";
import { defaultVariant, priceLabel, sortedVariants } from "@/lib/pricing";
import { ProductImage } from "@/components/product-image";
import { NewOrderMenu } from "@/components/portal/new-order-menu";

/**
 * A single gift box in the catalog grid, rebuilt to match the Figma: a large
 * image, the box name + descriptor, the price, and two actions. The image/text
 * and "View details" open the box's popup (via `onView`); "Order now" jumps into
 * the order builder pre-filled with this box at its default size.
 */
export function ProductCard({
  product,
  onView,
}: {
  product: ProductWithRelations;
  onView: () => void;
}) {
  const variants = sortedVariants(product.variants);
  const defaultV = defaultVariant(variants);

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-brand-border-warm bg-white transition hover:-translate-y-0.5 hover:shadow-[0px_8px_24px_0px_rgba(0,0,0,0.08)]">
      <button type="button" onClick={onView} className="flex flex-col text-left">
        <div className="relative aspect-[7/6] w-full overflow-hidden bg-brand-sand">
          <ProductImage src={product.image_url} alt={product.name} />
        </div>
        <div className="flex flex-col gap-1 px-6 pt-6">
          <h3 className="text-[20px] font-extrabold text-brand-navy">{product.name}</h3>
          {product.description && (
            <p className="line-clamp-2 text-[14px] font-normal text-brand-navy/70">
              {product.description}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-5">
        <p className="text-[16px] font-bold text-brand-navy">{priceLabel(variants)}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onView}
            className="rounded-[10px] border border-brand-navy px-4 py-2.5 text-[13px] font-bold text-brand-navy transition hover:bg-brand-navy/[0.06]"
          >
            View details
          </button>
          <NewOrderMenu
            triggerLabel={`Order ${product.name}`}
            boxHandle={product.shopify_handle}
            variantId={defaultV?.id}
            triggerClassName="inline-flex items-center rounded-md bg-brand-navy px-4 py-2.5 text-[13px] font-bold text-white outline-none transition hover:bg-brand-navy/90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Order now
          </NewOrderMenu>
        </div>
      </div>
    </div>
  );
}
