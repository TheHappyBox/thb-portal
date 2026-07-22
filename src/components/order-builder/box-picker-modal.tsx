"use client";

import { useEffect } from "react";
import type { ProductWithRelations } from "@/types/catalog";
import { defaultVariant, priceLabel, sortedVariants } from "@/lib/pricing";
import { ProductImage } from "@/components/product-image";

/**
 * Compact box picker for swapping the chosen box mid-build, without sending the
 * buyer back through a whole step. Lists the catalog as a scannable set of rows;
 * choosing one applies it at its default size (the size is then adjustable on the
 * "You're sending" card).
 *
 * Closes on the × button, a backdrop click, or Escape; locks body scroll.
 */
export function BoxPickerModal({
  products,
  selectedProductId,
  onSelect,
  onClose,
}: {
  products: ProductWithRelations[];
  selectedProductId?: string;
  onSelect: (productId: string, variantId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
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
        aria-labelledby="box-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[80vh] w-[560px] max-w-full flex-col rounded-[12px] border border-brand-border-warm bg-white shadow-[0px_2px_5px_rgba(0,0,0,0.05),0px_18px_24px_rgba(0,0,0,0.1)]"
      >
        <div className="flex flex-none items-center justify-between border-b border-brand-border-warm px-6 py-4">
          <h2 id="box-picker-title" className="text-[18px] font-extrabold text-brand-navy">
            Choose a different box
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-[10px] border border-brand-border-warm bg-white text-[18px] font-extrabold text-brand-navy transition hover:bg-brand-sand"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {products.length === 0 ? (
            <p className="px-3 py-6 text-center text-[14px] text-brand-ink-soft">
              No boxes in the catalog yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {products.map((product) => {
                const variants = sortedVariants(product.variants);
                const fallback = defaultVariant(variants)?.id ?? variants[0]?.id;
                const isCurrent = product.id === selectedProductId;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={!fallback}
                      onClick={() => fallback && onSelect(product.id, fallback)}
                      className={`flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition disabled:opacity-50 ${
                        isCurrent
                          ? "border-brand-yellow bg-brand-yellow/[0.13]"
                          : "border-transparent hover:border-brand-border-warm hover:bg-brand-sand/60"
                      }`}
                    >
                      <span className="size-14 shrink-0 overflow-hidden rounded-[8px] bg-brand-sand">
                        <ProductImage src={product.image_url} alt={product.name} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[14px] font-extrabold text-brand-navy">
                          {product.name}
                        </span>
                        <span className="text-[12px] text-brand-ink-soft">
                          {priceLabel(variants)}
                        </span>
                      </span>
                      {isCurrent && (
                        <span className="shrink-0 text-[12px] font-bold text-brand-navy">
                          Current
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
