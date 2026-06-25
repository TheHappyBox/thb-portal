"use client";

import type { BrandingOption, ProductWithRelations } from "@/types/catalog";
import type { BuilderState } from "@/types/order";
import { formatPrice } from "@/lib/pricing";
import { brandingById, orderTotalCents, resolveBoxes } from "@/lib/order-builder";
import { ProductImage } from "@/components/product-image";

/**
 * Review step: recaps mode, boxes, gift options (branding + shared message), and
 * recipients, with a correct order total (box price + per-gift branding add-ons,
 * times quantity). "Continue to checkout" is disabled — checkout is the next
 * piece. Every earlier step is one click away to edit.
 */
export function OrderSummary({
  state,
  products,
  brandingOptions,
  onEditMode,
  onEditBoxes,
  onEditGiftOptions,
  onEditRecipients,
}: {
  state: BuilderState;
  products: ProductWithRelations[];
  brandingOptions: BrandingOption[];
  onEditMode: () => void;
  onEditBoxes: () => void;
  onEditGiftOptions: () => void;
  onEditRecipients: () => void;
}) {
  const views = resolveBoxes(state.boxes, products);
  const messageCard = brandingById(brandingOptions, state.messageCardOptionId);
  const boxBranding = brandingById(brandingOptions, state.boxBrandingOptionId);

  const currency = views[0]?.variant.currency ?? "CAD";
  const addonPerUnit = (messageCard?.price_cents ?? 0) + (boxBranding?.price_cents ?? 0);
  const totalUnits = views.reduce((s, v) => s + v.quantity, 0);
  const addonsSubtotal = addonPerUnit * totalUnits;
  const total = orderTotalCents(views, messageCard, boxBranding);

  const modeLabel = state.mode === "single" ? "Single recipient" : "Multiple recipients";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-brand-ink">Review your order</h2>
        <p className="text-brand-muted">Here&apos;s everything you&apos;ve put together.</p>
      </div>

      <SummaryCard label="Recipients" onEdit={onEditMode}>
        <p className="font-medium text-brand-ink">{modeLabel}</p>
      </SummaryCard>

      {/* Boxes */}
      <SummaryCard label="Boxes" onEdit={onEditBoxes}>
        <ul className="flex flex-col divide-y divide-brand-sand">
          {views.map((view) => (
            <li key={`${view.productId}-${view.variantId}`} className="flex items-center gap-3 py-3">
              <div className="h-12 w-12 overflow-hidden rounded-md border border-brand-sand">
                <ProductImage src={view.product.image_url} alt={view.product.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-brand-ink">{view.product.name}</p>
                <p className="text-sm text-brand-muted">
                  {view.variant.name} ·{" "}
                  {formatPrice(view.variant.price_cents, view.variant.currency)} × {view.quantity}
                </p>
              </div>
              <div className="text-sm font-semibold text-brand-ink">
                {formatPrice(view.lineTotalCents, view.variant.currency)}
              </div>
            </li>
          ))}
        </ul>
      </SummaryCard>

      {/* Gift options */}
      <SummaryCard label="Gift options" onEdit={onEditGiftOptions}>
        <dl className="flex flex-col gap-1 text-sm">
          <Row term="Message card" value={brandingLabel(messageCard)} />
          <Row term="Box branding" value={brandingLabel(boxBranding)} />
          {addonPerUnit > 0 && (
            <Row
              term="Branding add-ons"
              value={`${formatPrice(addonPerUnit, currency)} × ${totalUnits} gift${
                totalUnits === 1 ? "" : "s"
              } = ${formatPrice(addonsSubtotal, currency)}`}
            />
          )}
        </dl>
        {state.sharedMessage.trim() && (
          <p className="mt-2 rounded-md bg-brand-cream px-3 py-2 text-sm italic text-brand-ink">
            “{state.sharedMessage.trim()}”
          </p>
        )}
      </SummaryCard>

      {/* Recipients list */}
      <SummaryCard
        label={`Recipients (${state.recipients.length})`}
        onEdit={onEditRecipients}
      >
        {state.recipients.length === 0 ? (
          <p className="text-sm text-brand-muted">None added yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {state.recipients.slice(0, 8).map((r, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-brand-ink">{r.fullName || "Unnamed recipient"}</span>
                <span className="text-xs text-brand-muted">
                  {r.selfClaim ? "Self-claim link" : "Address provided"}
                </span>
              </li>
            ))}
            {state.recipients.length > 8 && (
              <li className="text-xs text-brand-muted">
                + {state.recipients.length - 8} more
              </li>
            )}
          </ul>
        )}
      </SummaryCard>

      {/* Total */}
      <div className="flex items-center justify-between rounded-xl border border-brand-sand bg-white p-4">
        <span className="font-semibold text-brand-ink">Order total</span>
        <span className="text-xl font-semibold text-brand-ink">
          {formatPrice(total, currency)}
        </span>
      </div>

      {/* Next step (coming soon) */}
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-md bg-brand-berry px-5 py-2.5 text-sm font-medium text-white opacity-50"
        >
          Continue to checkout →
        </button>
        <p className="text-xs text-brand-muted">
          Checkout and payment are coming soon — that&apos;s the next step we&apos;re building.
        </p>
      </div>
    </section>
  );
}

function brandingLabel(option: BrandingOption | undefined): string {
  if (!option) return "Not chosen";
  return option.price_cents === 0
    ? option.name
    : `${option.name} (+${formatPrice(option.price_cents, option.currency)})`;
}

function SummaryCard({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</p>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm text-brand-berry underline transition hover:text-brand-berry-dark"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-muted">{term}</dt>
      <dd className="text-brand-ink">{value}</dd>
    </div>
  );
}
