"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductVariant } from "@/types/catalog";
import { defaultVariant, formatPrice, sortedVariants } from "@/lib/pricing";

/**
 * Size picker on the product detail page. Receives a product's sizes and lets the
 * shopper choose between "Happy" and "Extra Happy" (or shows the single size for
 * fixed boxes), updating the displayed price as they select. The "Start an order"
 * button carries the chosen size into the order builder (/orders/new) via URL.
 */
export function ProductSizeSelector({
  variants,
  shopifyHandle,
}: {
  variants: ProductVariant[];
  shopifyHandle: string | null;
}) {
  const sorted = sortedVariants(variants);
  const initial = defaultVariant(sorted) ?? sorted[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(initial?.id);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">Pricing coming soon.</p>;
  }

  const selected = sorted.find((v) => v.id === selectedId) ?? initial;
  const isSingleSize = sorted.length === 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-foreground">
          {formatPrice(selected.price_cents, selected.currency)}
        </span>
        {!isSingleSize && (
          <span className="text-sm text-muted-foreground">· {selected.name}</span>
        )}
      </div>

      {!isSingleSize && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Choose a size</span>
          <div
            role="radiogroup"
            aria-label="Box size"
            className="flex flex-wrap gap-2"
          >
            {sorted.map((v) => {
              const active = v.id === selected.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedId(v.id)}
                  className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-sm font-medium">
                    {v.name}
                  </span>
                  <span className="text-sm">
                    {formatPrice(v.price_cents, v.currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {shopifyHandle && (
        <Link
          href={`/orders/new?box=${shopifyHandle}&variant=${selected.id}`}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          Start an order with this box →
        </Link>
      )}
    </div>
  );
}
