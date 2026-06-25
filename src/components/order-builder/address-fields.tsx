"use client";

import type { RecipientDraft } from "@/types/order";

const inputClass =
  "rounded-md border border-brand-sand bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-berry";

/**
 * Controlled shipping-address inputs for a recipient. Shared by the single-mode
 * form and the bulk manual rows. All optional at the data layer (the recipients
 * step warns when an address is missing and self-claim is off).
 */
export function AddressFields({
  recipient,
  onPatch,
}: {
  recipient: RecipientDraft;
  onPatch: (patch: Partial<RecipientDraft>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input
        className={`${inputClass} sm:col-span-2`}
        placeholder="Address line 1"
        autoComplete="address-line1"
        value={recipient.addressLine1}
        onChange={(e) => onPatch({ addressLine1: e.target.value })}
      />
      <input
        className={`${inputClass} sm:col-span-2`}
        placeholder="Address line 2 (optional)"
        autoComplete="address-line2"
        value={recipient.addressLine2}
        onChange={(e) => onPatch({ addressLine2: e.target.value })}
      />
      <input
        className={inputClass}
        placeholder="City"
        autoComplete="address-level2"
        value={recipient.city}
        onChange={(e) => onPatch({ city: e.target.value })}
      />
      <input
        className={inputClass}
        placeholder="Province / region"
        autoComplete="address-level1"
        value={recipient.region}
        onChange={(e) => onPatch({ region: e.target.value })}
      />
      <input
        className={inputClass}
        placeholder="Postal code"
        autoComplete="postal-code"
        value={recipient.postalCode}
        onChange={(e) => onPatch({ postalCode: e.target.value })}
      />
      <input
        className={inputClass}
        placeholder="Country"
        autoComplete="country-name"
        value={recipient.country}
        onChange={(e) => onPatch({ country: e.target.value })}
      />
    </div>
  );
}
