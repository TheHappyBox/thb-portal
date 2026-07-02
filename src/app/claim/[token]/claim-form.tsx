"use client";

import { useActionState } from "react";
import { submitClaim } from "@/app/claim/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="flex flex-col gap-1">
        <Label htmlFor="fullName">Your name</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          autoComplete="name"
          defaultValue={initial.fullName}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="addressLine1">Address</Label>
        <Input
          id="addressLine1"
          name="addressLine1"
          required
          placeholder="Street address"
          autoComplete="address-line1"
          defaultValue={initial.addressLine1}
        />
      </div>
      <Input
        name="addressLine2"
        placeholder="Apartment, suite, etc. (optional)"
        autoComplete="address-line2"
        defaultValue={initial.addressLine2}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          name="city"
          required
          placeholder="City"
          autoComplete="address-level2"
          defaultValue={initial.city}
        />
        <Input
          name="region"
          placeholder="Province / region"
          autoComplete="address-level1"
          defaultValue={initial.region}
        />
        <Input
          name="postalCode"
          required
          placeholder="Postal code"
          autoComplete="postal-code"
          defaultValue={initial.postalCode}
        />
        <Input
          name="country"
          required
          placeholder="Country"
          autoComplete="country-name"
          defaultValue={initial.country}
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

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Saving…" : state?.ok ? "Update my address" : "Save my address"}
      </Button>
    </form>
  );
}
