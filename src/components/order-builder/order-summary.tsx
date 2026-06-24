"use client";

import type { ProductWithRelations } from "@/types/catalog";
import type { BuilderState } from "@/types/order";
import { formatPrice } from "@/lib/pricing";
import { orderTotalCents, resolveBoxes } from "@/lib/order-builder";
import { ProductImage } from "@/components/product-image";

/**
 * End-of-slice summary: recaps the chosen mode and boxes with a running total.
 * "Continue to recipients" is intentionally disabled — the recipients step is the
 * next feature. Editing either earlier step is one click away.
 */
export function OrderSummary({
  state,
  products,
  onEditMode,
  onEditBoxes,
}: {
  state: BuilderState;
  products: ProductWithRelations[];
  onEditMode: () => void;
  onEditBoxes: () => void;
}) {
  const views = resolveBoxes(state.boxes, products);
  const total = orderTotalCents(views);
  const currency = views[0]?.variant.currency ?? "CAD";
  const modeLabel =
    state.mode === "single" ? "Single recipient" : "Multiple recipients";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-brand-ink">Review your order</h2>
        <p className="text-brand-muted">
          Here&apos;s what you&apos;ve put together so far.
        </p>
      </div>

      {/* Mode */}
      <div className="flex items-center justify-between rounded-xl border border-brand-sand bg-white p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            Recipients
          </p>
          <p className="font-medium text-brand-ink">{modeLabel}</p>
        </div>
        <button
          type="button"
          onClick={onEditMode}
          className="text-sm text-brand-berry underline transition hover:text-brand-berry-dark"
        >
          Edit
        </button>
      </div>

      {/* Boxes */}
      <div className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            Boxes
          </p>
          <button
            type="button"
            onClick={onEditBoxes}
            className="text-sm text-brand-berry underline transition hover:text-brand-berry-dark"
          >
            Edit
          </button>
        </div>

        <ul className="flex flex-col divide-y divide-brand-sand">
          {views.map((view) => (
            <li
              key={`${view.productId}-${view.variantId}`}
              className="flex items-center gap-3 py-3"
            >
              <div className="h-12 w-12 overflow-hidden rounded-md border border-brand-sand">
                <ProductImage src={view.product.image_url} alt={view.product.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-brand-ink">
                  {view.product.name}
                </p>
                <p className="text-sm text-brand-muted">
                  {view.variant.name} · {formatPrice(view.variant.price_cents, view.variant.currency)} ×{" "}
                  {view.quantity}
                </p>
              </div>
              <div className="text-sm font-semibold text-brand-ink">
                {formatPrice(view.lineTotalCents, view.variant.currency)}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-brand-sand pt-3">
          <span className="font-semibold text-brand-ink">Order total</span>
          <span className="text-lg font-semibold text-brand-ink">
            {formatPrice(total, currency)}
          </span>
        </div>
      </div>

      {/* Next step (coming soon) */}
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-md bg-brand-berry px-5 py-2.5 text-sm font-medium text-white opacity-50"
        >
          Continue to recipients →
        </button>
        <p className="text-xs text-brand-muted">
          Adding recipients and delivery is coming soon — that&apos;s the next step
          we&apos;re building.
        </p>
      </div>
    </section>
  );
}
