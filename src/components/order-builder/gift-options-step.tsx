"use client";

import type { BrandingOption } from "@/types/catalog";
import type { SelectedBoxView } from "@/types/order";
import { brandingForGroup } from "@/lib/order-builder";
import { formatPrice, sortedVariants } from "@/lib/pricing";
import { ProductImage } from "@/components/product-image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Step 3 — "Gift options" (Figma redesign). A live preview of the chosen box on
 * the left; on the right the box summary, a shared gift message, and the add-ons:
 * a branded-message-card toggle and a box-branding picker (both real
 * branding_options, priced per gift). Selections + message flow back to the
 * builder, which keeps the running total in sync.
 *
 * Note: the Figma also shows To/From message fields and a per-order logo upload.
 * Our data model has neither (one shared message; the company logo lives in
 * Settings, not on an order), so those are omitted rather than faked.
 */
export function GiftOptionsStep({
  brandingOptions,
  messageCardOptionId,
  boxBrandingOptionId,
  giftTo,
  giftFrom,
  sharedMessage,
  boxViews,
  onChange,
  onChangeBox,
  onChangeVariant,
}: {
  brandingOptions: BrandingOption[];
  messageCardOptionId: string | null;
  boxBrandingOptionId: string | null;
  giftTo: string;
  giftFrom: string;
  sharedMessage: string;
  boxViews: SelectedBoxView[];
  onChange: (patch: {
    messageCardOptionId?: string;
    boxBrandingOptionId?: string;
    giftTo?: string;
    giftFrom?: string;
    sharedMessage?: string;
  }) => void;
  /** Swap the chosen box — opens the picker (single) or returns to the box step. */
  onChangeBox: () => void;
  /**
   * Change the chosen box's SIZE inline. Only supplied when the box step is
   * skipped (single send that arrived with a box), where there's no step to go
   * back to — so the size control lives on the "You're sending" card instead.
   */
  onChangeVariant?: (variantId: string) => void;
}) {
  const messageCards = brandingForGroup(brandingOptions, "message_card");
  const boxBrandings = brandingForGroup(brandingOptions, "box_branding");
  // The message-card group is a free "none" + a paid "branded" option → a toggle.
  const paidCard = messageCards.find((o) => o.price_cents > 0);
  const freeCard = messageCards.find((o) => o.price_cents === 0);
  const cardOn = !!paidCard && messageCardOptionId === paidCard.id;

  const preview = boxViews[0] ?? null;
  const moreBoxes = Math.max(0, boxViews.length - 1);
  // Sizes offered by the chosen box, for the inline size control.
  const sizeOptions = preview
    ? sortedVariants(preview.product.variants.filter((v) => v.available))
    : [];
  const sizeLine = (v: SelectedBoxView) =>
    `${v.variant.name} · ${formatPrice(v.variant.price_cents, v.variant.currency)}`;

  return (
    <section className="flex flex-col gap-10 lg:flex-row">
      {/* Left: live preview */}
      <div className="flex w-full flex-col gap-3 lg:w-[480px]">
        <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#6b7280]">
          Live preview
        </p>
        <div className="flex flex-col gap-4 rounded-[16px] border border-[#e8e8e8] bg-[#fff8e7] p-6">
          <div className="relative h-[400px] w-full overflow-hidden rounded-[12px] bg-white">
            {preview ? (
              <ProductImage src={preview.product.image_url} alt={preview.product.name} />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-[14px] text-[#6b7280]">
                No box selected yet.
              </div>
            )}
          </div>
          {preview && (
            <div className="flex flex-col gap-2">
              <p className="text-[16px] font-extrabold text-brand-navy">{preview.product.name}</p>
              <p className="text-[13px] text-[#6b7280]">
                {sizeLine(preview)}
                {moreBoxes > 0 ? ` · +${moreBoxes} more box${moreBoxes === 1 ? "" : "es"}` : ""}
              </p>
              <button
                type="button"
                onClick={onChangeBox}
                className="w-fit text-[13px] font-bold text-brand-navy underline"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: options */}
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        {/* You're sending — the chosen box, changeable in place */}
        {preview && (
          <div className="flex flex-col gap-2">
            {onChangeVariant && (
              <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#6b7280]">
                You&apos;re sending
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#e5e7eb] bg-[#f6f8fb] p-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-[10px] bg-[#fff8e7]">
                  <ProductImage src={preview.product.image_url} alt={preview.product.name} />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-[14px] font-extrabold text-brand-navy">
                    {preview.product.name}
                  </p>
                  {preview.product.description && (
                    <p className="line-clamp-1 text-[12px] text-[#6b7280]">
                      {preview.product.description}
                    </p>
                  )}
                  {onChangeVariant ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {sizeOptions.length > 1 ? (
                        <label className="flex items-center gap-2">
                          <span className="sr-only">Size</span>
                          <select
                            value={preview.variantId}
                            onChange={(e) => onChangeVariant(e.target.value)}
                            className="rounded-md border border-[#e5e7eb] bg-white px-2 py-1 text-[12px] font-medium text-brand-navy"
                          >
                            {sizeOptions.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} · {formatPrice(v.price_cents, v.currency)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span className="text-[12px] text-[#6b7280]">{sizeLine(preview)}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#6b7280]">{sizeLine(preview)}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onChangeBox}
                className="shrink-0 text-[13px] font-bold text-brand-navy underline"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Gift message */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[18px] font-extrabold text-brand-navy">Gift message</h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="gift-to" className="text-[13px] font-bold text-brand-navy">
                To
              </label>
              <Input
                id="gift-to"
                value={giftTo}
                onChange={(e) => onChange({ giftTo: e.target.value })}
                placeholder="Recipient name"
                className="h-12 rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="gift-from" className="text-[13px] font-bold text-brand-navy">
                From
              </label>
              <Input
                id="gift-from"
                value={giftFrom}
                onChange={(e) => onChange({ giftFrom: e.target.value })}
                placeholder="Your name"
                className="h-12 rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="shared-message" className="text-[13px] font-bold text-brand-navy">
                Message
              </label>
              <Textarea
                id="shared-message"
                value={sharedMessage}
                onChange={(e) => onChange({ sharedMessage: e.target.value })}
                rows={4}
                placeholder="Write a personal note for every recipient…"
                className="min-h-[120px] rounded-[10px]"
              />
            </div>
          </div>
        </div>

        {/* Add-on items */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[18px] font-extrabold text-brand-navy">Add-on items</h3>
            <p className="text-[14px] text-[#6b7280]">
              Optional branding on every gift. Priced per recipient.
            </p>
          </div>

          {/* Branded message card — toggle */}
          {paidCard && (
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e5e7eb] bg-white p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[14px] font-bold text-brand-navy">{paidCard.name}</p>
                <p className="text-[13px] text-[#6b7280]">A personalized card in each box</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-[13px] font-bold text-brand-navy">
                  +{formatPrice(paidCard.price_cents, paidCard.currency)}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cardOn}
                  aria-label={paidCard.name}
                  onClick={() =>
                    onChange({
                      messageCardOptionId: cardOn ? (freeCard?.id ?? paidCard.id) : paidCard.id,
                    })
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    cardOn ? "bg-brand-yellow" : "bg-[#d1d5db]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                      cardOn ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Box branding — radio cards */}
          {boxBrandings.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-[14px] font-extrabold text-brand-navy">Choose your box branding</p>
                <p className="text-[13px] text-[#6b7280]">
                  Select one option for the outer packaging.
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label="Box branding"
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {boxBrandings.map((o) => {
                  const active = o.id === boxBrandingOptionId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChange({ boxBrandingOptionId: o.id })}
                      className={`flex flex-col gap-2 rounded-[12px] border p-3 text-left transition ${
                        active
                          ? "border-brand-yellow"
                          : "border-[#e5e7eb] hover:border-brand-yellow/50"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-brand-navy">{o.name}</span>
                        <span
                          aria-hidden="true"
                          className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border ${
                            active ? "border-brand-yellow bg-brand-yellow" : "border-[#d1d5db] bg-white"
                          }`}
                        >
                          {active && <span className="size-1.5 rounded-full bg-white" />}
                        </span>
                      </span>
                      <span className="text-[13px] font-bold text-brand-navy">
                        {o.price_cents === 0
                          ? "Included"
                          : `+${formatPrice(o.price_cents, o.currency)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
