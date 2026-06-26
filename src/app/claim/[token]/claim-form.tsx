"use client";

import { useActionState } from "react";
import { submitClaim } from "@/app/claim/actions";

const inputClass =
  "rounded-md border border-brand-sand bg-white px-3 py-2 text-base text-brand-ink outline-none focus:border-brand-berry";

type State = { ok: boolean; error?: string } | undefined;

export interface ClaimInitial {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

/**
 * The recipient's address form. Prefilled with anything already saved and
 * editable on every visit (until the gift is fulfilled). Submits to the public
 * claim action; on success it shows a friendly confirmation and stays editable.
 */
export function ClaimForm({
  token,
  initial,
}: {
  token: string;
  initial: ClaimInitial;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) =>
      submitClaim(token, {
        fullName: String(formData.get("fullName") ?? ""),
        addressLine1: String(formData.get("addressLine1") ?? ""),
        addressLine2: String(formData.get("addressLine2") ?? ""),
        city: String(formData.get("city") ?? ""),
        region: String(formData.get("region") ?? ""),
        postalCode: String(formData.get("postalCode") ?? ""),
        country: String(formData.get("country") ?? ""),
      }),
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-brand-ink">
        Your name
        <input
          name="fullName"
          required
          autoComplete="name"
          defaultValue={initial.fullName}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-brand-ink">
        Address
        <input
          name="addressLine1"
          required
          placeholder="Street address"
          autoComplete="address-line1"
          defaultValue={initial.addressLine1}
          className={inputClass}
        />
      </label>
      <input
        name="addressLine2"
        placeholder="Apartment, suite, etc. (optional)"
        autoComplete="address-line2"
        defaultValue={initial.addressLine2}
        className={inputClass}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="city"
          required
          placeholder="City"
          autoComplete="address-level2"
          defaultValue={initial.city}
          className={inputClass}
        />
        <input
          name="region"
          placeholder="Province / region"
          autoComplete="address-level1"
          defaultValue={initial.region}
          className={inputClass}
        />
        <input
          name="postalCode"
          required
          placeholder="Postal code"
          autoComplete="postal-code"
          defaultValue={initial.postalCode}
          className={inputClass}
        />
        <input
          name="country"
          required
          placeholder="Country"
          autoComplete="country-name"
          defaultValue={initial.country}
          className={inputClass}
        />
      </div>

      {state && !state.ok && state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p
          role="status"
          className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Thank you! Your address is saved. You can come back to this link to update it
          any time before your gift ships.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-brand-berry px-5 py-3 text-base font-medium text-white transition hover:bg-brand-berry-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : state?.ok ? "Update my address" : "Save my address"}
      </button>
    </form>
  );
}
