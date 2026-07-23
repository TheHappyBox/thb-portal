"use client";

import { useEffect, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { defaultVariant, priceLabel, sortedVariants } from "@/lib/pricing";
import { NewOrderMenu } from "@/components/portal/new-order-menu";
import type { ProductWithRelations } from "@/types/catalog";

/**
 * The box-detail popup (Figma redesign): a fixed image on the left and a single
 * scrolling detail column on the right — category, title, price, size picker,
 * CTA, then the description.
 *
 * Wired to REAL product data: image, featured flag, category, name, price, the
 * available sizes as selectable cards, and a CTA that carries the chosen size
 * into the order builder. The Figma's "What's inside" checklist needs a box-
 * contents field we don't store yet, so it's omitted rather than faked (see the
 * note in the catalog page).
 *
 * Closes on the × button, a backdrop click, or Escape; locks body scroll while open.
 */
export function BoxDetailModal({
  product,
  onClose,
}: {
  product: ProductWithRelations;
  onClose: () => void;
}) {
  const sizes = sortedVariants(product.variants.filter((v) => v.available));
  const initial = defaultVariant(sizes) ?? sizes[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(initial?.id);
  const selected = sizes.find((v) => v.id === selectedId) ?? initial;

  // Close on Escape; lock background scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="box-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-[900px] max-w-full flex-col gap-8 overflow-y-auto rounded-[12px] border border-brand-border-warm bg-white p-8 shadow-[0px_2px_5px_rgba(0,0,0,0.05),0px_18px_24px_rgba(0,0,0,0.1)] md:h-[680px] md:flex-row md:gap-12 md:overflow-hidden md:p-10"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-10 flex size-9 items-center justify-center rounded-[10px] border border-brand-border-warm bg-white text-[18px] font-extrabold text-brand-navy transition hover:bg-brand-sand"
        >
          ×
        </button>

        {/* Left: image (fixed) */}
        <div className="w-full shrink-0 md:w-[360px] md:self-stretch">
          <div className="relative aspect-square w-full overflow-hidden rounded-[12px] bg-brand-yellow md:aspect-auto md:h-full">
            <ProductImage src={product.image_url} alt={product.name} />
            {product.is_featured && (
              <span className="absolute left-4 top-4 rounded-[5px] bg-brand-pink px-4 py-2 text-[12px] font-extrabold uppercase text-white">
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Right: scrolling detail column */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 md:min-h-0 md:overflow-y-auto md:pr-2">
          {product.category?.name && (
            <span className="w-fit rounded-full border border-brand-border-warm bg-white px-4 py-2 text-[13px] font-bold text-brand-navy">
              {product.category.name}
            </span>
          )}

          <h2
            id="box-detail-title"
            className="pr-10 text-[40px] font-extrabold leading-tight text-brand-navy"
          >
            {product.name}
          </h2>

          {sizes.length > 0 && (
            <p className="text-[28px] font-extrabold text-brand-navy">{priceLabel(sizes)}</p>
          )}

          {/* Choose a size */}
          {sizes.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[18px] font-extrabold text-brand-navy">Choose a size</p>
              <div role="radiogroup" aria-label="Box size" className="flex flex-wrap gap-4">
                {sizes.map((v) => {
                  const active = v.id === selected?.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelectedId(v.id)}
                      className={`flex min-w-[150px] flex-1 items-center justify-between gap-2 rounded-[10px] p-5 text-left transition ${
                        active
                          ? "border-2 border-brand-yellow-deep bg-brand-yellow"
                          : "border border-brand-navy bg-white hover:bg-brand-sand"
                      }`}
                    >
                      <span className="text-[16px] font-extrabold text-brand-navy">{v.name}</span>
                      <span
                        aria-hidden="true"
                        className={`size-5 shrink-0 rounded-full ${
                          active ? "bg-brand-navy" : "border-2 border-brand-navy/40"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA — forks into a single or bulk send, carrying this box + size */}
          <div className="flex flex-col gap-3">
            <NewOrderMenu
              triggerLabel={`Start an order with ${product.name}`}
              boxHandle={product.shopify_handle}
              variantId={selected?.id}
              align="center"
              triggerClassName="flex h-14 w-full items-center justify-center rounded-[10px] bg-brand-navy text-[18px] font-bold text-white outline-none transition hover:bg-brand-navy/90 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Start an order with this box →
            </NewOrderMenu>
            <p className="text-center text-[13px] text-brand-ink-soft">
              Usually ships within 3–5 business days
            </p>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-[16px] leading-[1.6] text-brand-ink-soft">{product.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
