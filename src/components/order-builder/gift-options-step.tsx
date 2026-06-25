"use client";

import type { BrandingOption } from "@/types/catalog";
import { brandingForGroup } from "@/lib/order-builder";
import { formatPrice } from "@/lib/pricing";

/**
 * "Gift options" step. The buyer chooses one message-card option and one
 * box-branding option for the whole order (each priced per gift, on top of the
 * box price) and optionally writes a shared gift message. Selections + message
 * flow back to the builder, which keeps the running total in sync.
 */
export function GiftOptionsStep({
  brandingOptions,
  messageCardOptionId,
  boxBrandingOptionId,
  sharedMessage,
  onChange,
}: {
  brandingOptions: BrandingOption[];
  messageCardOptionId: string | null;
  boxBrandingOptionId: string | null;
  sharedMessage: string;
  onChange: (patch: {
    messageCardOptionId?: string;
    boxBrandingOptionId?: string;
    sharedMessage?: string;
  }) => void;
}) {
  const messageCards = brandingForGroup(brandingOptions, "message_card");
  const boxBrandings = brandingForGroup(brandingOptions, "box_branding");

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-brand-ink">Gift options</h2>
        <p className="text-brand-muted">
          Add optional branding to every gift, and write a message to include. Branding
          is priced per gift.
        </p>
      </div>

      <BrandingGroupPicker
        legend="Message card"
        options={messageCards}
        selectedId={messageCardOptionId}
        onSelect={(id) => onChange({ messageCardOptionId: id })}
      />

      <BrandingGroupPicker
        legend="Box branding"
        options={boxBrandings}
        selectedId={boxBrandingOptionId}
        onSelect={(id) => onChange({ boxBrandingOptionId: id })}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="shared-message" className="text-sm font-medium text-brand-ink">
          Gift message <span className="font-normal text-brand-muted">(optional)</span>
        </label>
        <textarea
          id="shared-message"
          value={sharedMessage}
          onChange={(e) => onChange({ sharedMessage: e.target.value })}
          rows={3}
          placeholder="A note included with every gift — recipients can be given their own message too."
          className="rounded-md border border-brand-sand bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-berry"
        />
      </div>
    </section>
  );
}

function BrandingGroupPicker({
  legend,
  options,
  selectedId,
  onSelect,
}: {
  legend: string;
  options: BrandingOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-brand-ink">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = o.id === selectedId;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(o.id)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                active
                  ? "border-brand-berry bg-brand-cream ring-1 ring-brand-berry"
                  : "border-brand-sand bg-white hover:border-brand-berry"
              }`}
            >
              <span className="text-sm font-medium text-brand-ink">{o.name}</span>
              <span className="text-sm text-brand-muted">
                {o.price_cents === 0 ? "Included" : `+${formatPrice(o.price_cents, o.currency)}`}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
