"use client";

import type { RecipientDraft } from "@/types/order";
import type { RecipientFieldErrors } from "@/lib/order-builder";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/order-builder/field-error";

/**
 * Controlled shipping-address inputs for a recipient. Shared by the single-mode
 * form and the bulk manual rows. All optional at the data layer (a recipient can
 * be sent a self-claim link instead), so missing-address messages render under
 * their own field as advisories rather than blocking errors.
 */
export function AddressFields({
  recipient,
  errors,
  onPatch,
}: {
  recipient: RecipientDraft;
  errors?: RecipientFieldErrors;
  onPatch: (patch: Partial<RecipientDraft>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1 sm:col-span-2">
        <Input
          placeholder="Address line 1"
          autoComplete="address-line1"
          aria-invalid={!!errors?.addressLine1}
          value={recipient.addressLine1}
          onChange={(e) => onPatch({ addressLine1: e.target.value })}
        />
        <FieldError tone="advisory">{errors?.addressLine1}</FieldError>
      </div>

      <Input
        className="sm:col-span-2"
        placeholder="Address line 2 (optional)"
        autoComplete="address-line2"
        value={recipient.addressLine2}
        onChange={(e) => onPatch({ addressLine2: e.target.value })}
      />

      <div className="flex flex-col gap-1">
        <Input
          placeholder="City"
          autoComplete="address-level2"
          aria-invalid={!!errors?.city}
          value={recipient.city}
          onChange={(e) => onPatch({ city: e.target.value })}
        />
        <FieldError tone="advisory">{errors?.city}</FieldError>
      </div>

      <Input
        placeholder="Province / region"
        autoComplete="address-level1"
        value={recipient.region}
        onChange={(e) => onPatch({ region: e.target.value })}
      />

      <div className="flex flex-col gap-1">
        <Input
          placeholder="Postal code"
          autoComplete="postal-code"
          aria-invalid={!!errors?.postalCode}
          value={recipient.postalCode}
          onChange={(e) => onPatch({ postalCode: e.target.value })}
        />
        <FieldError tone="advisory">{errors?.postalCode}</FieldError>
      </div>

      <div className="flex flex-col gap-1">
        <Input
          placeholder="Country"
          autoComplete="country-name"
          aria-invalid={!!errors?.country}
          value={recipient.country}
          onChange={(e) => onPatch({ country: e.target.value })}
        />
        <FieldError tone="advisory">{errors?.country}</FieldError>
      </div>
    </div>
  );
}
