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
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-brand-ink">
          {mode === "single" ? "Choose a box" : "Choose your boxes"}
        </h2>
        <p className="text-brand-muted">
          {mode === "single"
            ? "Pick one box and a size for your recipient."
            : "Add one or more boxes, each with a size and quantity."}
        </p>
      </div>

      {/* Selected boxes — multiple mode shows an editable list. */}
      {mode === "multiple" && selectedViews.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-muted">
            Your boxes
          </h3>
          <ul className="flex flex-col divide-y divide-brand-sand">
            {selectedViews.map((view, index) => {
              const variants = sortedVariants(view.product.variants);
              return (
                <li
                  key={`${view.productId}-${view.variantId}`}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-brand-sand">
                    <ProductImage src={view.product.image_url} alt={view.product.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-brand-ink">
                      {view.product.name}
                    </p>
                    <p className="text-sm text-brand-muted">
                      {formatPrice(view.variant.price_cents, view.variant.currency)} each
                    </p>
                  </div>

                  {variants.length > 1 && (
                    <label className="text-sm text-brand-muted">
                      <span className="sr-only">Size for {view.product.name}</span>
                      <select
                        value={view.variantId}
                        onChange={(e) => changeVariant(index, e.target.value)}
                        className="rounded-md border border-brand-sand bg-white px-2 py-1 text-sm text-brand-ink"
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
                      className="h-7 w-7 rounded-md border border-brand-sand text-brand-ink transition hover:border-brand-berry disabled:opacity-40"
                      disabled={view.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-brand-ink">
                      {view.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${view.product.name}`}
                      onClick={() => setQuantity(index, view.quantity + 1)}
                      className="h-7 w-7 rounded-md border border-brand-sand text-brand-ink transition hover:border-brand-berry"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-20 text-right text-sm font-semibold text-brand-ink">
                    {formatPrice(view.lineTotalCents, view.variant.currency)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBox(index)}
                    className="text-sm text-brand-muted underline transition hover:text-brand-berry"
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
                  ? "border-brand-berry ring-1 ring-brand-berry"
                  : "border-brand-sand"
              }`}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <ProductImage src={product.image_url} alt={product.name} />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-semibold text-brand-ink">{product.name}</h3>
                <p className="text-sm font-medium text-brand-berry">
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
                              ? "border-brand-berry bg-brand-cream text-brand-ink"
                              : "border-brand-sand text-brand-muted hover:border-brand-berry"
                          }`}
                        >
                          {v.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    mode === "single"
                      ? selectSingle(product.id, selectedVariantId)
                      : addOrIncrement(product.id, selectedVariantId)
                  }
                  disabled={!selectedVariantId}
                  className={`mt-auto rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    isSingleSelected
                      ? "bg-brand-berry-dark text-white"
                      : "bg-brand-berry text-white hover:bg-brand-berry-dark"
                  }`}
                >
                  {mode === "single"
                    ? isSingleSelected
                      ? "Selected"
                      : "Select this box"
                    : "Add to order"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
