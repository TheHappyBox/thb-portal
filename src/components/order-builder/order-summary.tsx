"use client";

import type { BrandingOption, ProductWithRelations } from "@/types/catalog";
import type { BuilderState } from "@/types/order";
import { formatPrice } from "@/lib/pricing";
import { brandingById, orderTotalCents, resolveBoxes } from "@/lib/order-builder";
import { ProductImage } from "@/components/product-image";
import { ClaimLink } from "@/components/order-builder/claim-link";
import { CheckoutButton } from "@/components/order-builder/checkout-button";
import { Button } from "@/components/ui/button";

/**
 * Review step: recaps mode, boxes, gift options (branding + shared message), and
 * recipients, with a correct order total (box price + per-gift branding add-ons,
 * times quantity). "Continue to checkout" hands off to Stripe's hosted checkout.
 * Every earlier step is one click away to edit.
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
        <h2 className="text-2xl font-semibold text-foreground">Review your order</h2>
        <p className="text-muted-foreground">Here&apos;s everything you&apos;ve put together.</p>
      </div>

      <SummaryCard label="Recipients" onEdit={onEditMode}>
        <p className="font-medium text-foreground">{modeLabel}</p>
      </SummaryCard>

      {/* Boxes */}
      <SummaryCard label="Boxes" onEdit={onEditBoxes}>
        <ul className="flex flex-col divide-y divide-border">
          {views.map((view) => (
            <li key={`${view.productId}-${view.variantId}`} className="flex items-center gap-3 py-3">
              <div className="h-12 w-12 overflow-hidden rounded-md border border-border">
                <ProductImage src={view.product.image_url} alt={view.product.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{view.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {view.variant.name} ·{" "}
                  {formatPrice(view.variant.price_cents, view.variant.currency)} × {view.quantity}
                </p>
              </div>
              <div className="text-sm font-semibold text-foreground">
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
        {(state.giftTo.trim() || state.giftFrom.trim() || state.sharedMessage.trim()) && (
          <div className="mt-2 flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
            {state.giftTo.trim() && (
              <p>
                <span className="font-medium">To:</span> {state.giftTo.trim()}
              </p>
            )}
            {state.giftFrom.trim() && (
              <p>
                <span className="font-medium">From:</span> {state.giftFrom.trim()}
              </p>
            )}
            {state.sharedMessage.trim() && <p className="italic">“{state.sharedMessage.trim()}”</p>}
          </div>
        )}
      </SummaryCard>

      {/* Recipients list */}
      <SummaryCard
        label={`Recipients (${state.recipients.length})`}
        onEdit={onEditRecipients}
      >
        {state.recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">None added yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {state.recipients.slice(0, 8).map((r, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="text-foreground">{r.fullName || "Unnamed recipient"}</span>
                {r.selfClaim ? (
                  r.claimToken ? (
                    <ClaimLink token={r.claimToken} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Self-claim link</span>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">Address provided</span>
                )}
              </li>
            ))}
            {state.recipients.length > 8 && (
              <li className="py-2 text-xs text-muted-foreground">
                + {state.recipients.length - 8} more
              </li>
            )}
          </ul>
        )}
      </SummaryCard>

      {/* Total */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
        <span className="font-semibold text-foreground">Order total</span>
        <span className="text-xl font-semibold text-foreground">
          {formatPrice(total, currency)}
        </span>
      </div>

      {/* Next step: pay via Stripe's hosted checkout */}
      <CheckoutButton orderId={state.orderId} />
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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      {children}
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
