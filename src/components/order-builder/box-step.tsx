"use client";

import { useState } from "react";
import type { ProductWithRelations } from "@/types/catalog";
import type { OrderMode, SelectedBox } from "@/types/order";
import {
  defaultVariant,
  formatPrice,
  priceLabel,
  sortedVariants,
} from "@/lib/pricing";
import { resolveBoxes } from "@/lib/order-builder";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";

/**
 * "Choose box(es)" step. Independent of the mode step — it works whether mode was
 * set before or after. In SINGLE mode you pick exactly one box + size; in
 * MULTIPLE mode you add one or more boxes, each with a size and quantity. A box
 * pre-filled from an entry point is already in the selection here, editable.
 */
export function BoxStep({
  mode,
  products,
  boxes,
  onChange,
}: {
  mode: OrderMode;
  products: ProductWithRelations[];
  boxes: SelectedBox[];
  onChange: (boxes: SelectedBox[]) => void;
}) {
  // Which size is chosen in each picker card before adding/selecting.
  const [pickerVariant, setPickerVariant] = useState<Record<string, string>>({});

  const chosenVariantId = (product: ProductWithRelations) =>
    pickerVariant[product.id] ?? defaultVariant(product.variants)?.id ?? "";

  // ---- box-list mutations (all go through onChange) ----
  function selectSingle(productId: string, variantId: string) {
    onChange([{ productId, variantId, quantity: 1 }]);
  }

  function addOrIncrement(productId: string, variantId: string) {
    const idx = boxes.findIndex(
      (b) => b.productId === productId && b.variantId === variantId,
    );
    if (idx === -1) {
      onChange([...boxes, { productId, variantId, quantity: 1 }]);
    } else {
      onChange(
        boxes.map((b, i) =>
          i === idx ? { ...b, quantity: b.quantity + 1 } : b,
        ),
      );
    }
  }

  function setQuantity(index: number, quantity: number) {
    const q = Math.max(1, quantity);
    onChange(boxes.map((b, i) => (i === index ? { ...b, quantity: q } : b)));
  }

  function changeVariant(index: number, variantId: string) {
    const target = boxes[index];
    // If switching to a size that's already a separate row, merge quantities.
    const dupe = boxes.findIndex(
      (b, i) =>
        i !== index && b.productId === target.productId && b.variantId === variantId,
    );
    if (dupe === -1) {
      onChange(boxes.map((b, i) => (i === index ? { ...b, variantId } : b)));
    } else {
      onChange(
        boxes
          .map((b, i) =>
            i === dupe ? { ...b, quantity: b.quantity + target.quantity } : b,
          )
          .filter((_, i) => i !== index),
      );
    }
  }

  function removeBox(index: number) {
    onChange(boxes.filter((_, i) => i !== index));
  }

  const selectedViews = resolveBoxes(boxes, products);

  return (
    <section className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        {mode === "single"
          ? "Pick one box and a size for your recipient."
          : "Add one or more boxes, each with a size and quantity."}
      </p>

      {/* Selected boxes — multiple mode shows an editable list. */}
      {mode === "multiple" && selectedViews.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your boxes
          </h3>
          <ul className="flex flex-col divide-y divide-border">
            {selectedViews.map((view, index) => {
              const variants = sortedVariants(view.product.variants);
              return (
                <li
                  key={`${view.productId}-${view.variantId}`}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-border">
                    <ProductImage src={view.product.image_url} alt={view.product.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {view.product.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(view.variant.price_cents, view.variant.currency)} each
                    </p>
                  </div>

                  {variants.length > 1 && (
                    <label className="text-sm text-muted-foreground">
                      <span className="sr-only">Size for {view.product.name}</span>
                      <select
                        value={view.variantId}
                        onChange={(e) => changeVariant(index, e.target.value)}
                        className="rounded-md border border-border bg-white px-2 py-1 text-sm text-foreground"
                      >
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${view.product.name}`}
                      onClick={() => setQuantity(index, view.quantity - 1)}
                      className="h-7 w-7 rounded-md border border-border text-foreground transition hover:border-primary/40 disabled:opacity-40"
                      disabled={view.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-foreground">
                      {view.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${view.product.name}`}
                      onClick={() => setQuantity(index, view.quantity + 1)}
                      className="h-7 w-7 rounded-md border border-border text-foreground transition hover:border-primary/40"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-20 text-right text-sm font-semibold text-foreground">
                    {formatPrice(view.lineTotalCents, view.variant.currency)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBox(index)}
                    className="text-sm text-muted-foreground underline transition hover:text-primary"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Picker grid — all catalog boxes. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const variants = sortedVariants(product.variants);
          const selectedVariantId = chosenVariantId(product);
          const isSingleSelected =
            mode === "single" &&
            boxes[0]?.productId === product.id &&
            boxes[0]?.variantId === selectedVariantId;

          return (
            <div
              key={product.id}
              className={`flex flex-col overflow-hidden rounded-xl border bg-white transition ${
                isSingleSelected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border"
              }`}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <ProductImage src={product.image_url} alt={product.name} />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-semibold text-foreground">{product.name}</h3>
                <p className="text-sm font-medium text-primary">
                  {priceLabel(variants)}
                </p>

                {variants.length > 1 && (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Size">
                    {variants.map((v) => {
                      const active = v.id === selectedVariantId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setPickerVariant((prev) => ({ ...prev, [product.id]: v.id }))
                          }
                          className={`rounded-md border px-2.5 py-1 text-xs transition ${
                            active
                              ? "border-primary bg-muted/40 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {v.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() =>
                    mode === "single"
                      ? selectSingle(product.id, selectedVariantId)
                      : addOrIncrement(product.id, selectedVariantId)
                  }
                  disabled={!selectedVariantId}
                  className={`mt-auto ${
                    isSingleSelected ? "bg-primary/90 hover:bg-primary/90" : ""
                  }`}
                >
                  {mode === "single"
                    ? isSingleSelected
                      ? "Selected"
                      : "Select this box"
                    : "Add to order"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
