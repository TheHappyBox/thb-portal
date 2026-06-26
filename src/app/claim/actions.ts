"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Public (no-login) claim submission. Saves the recipient's address by token and
 * flips their status to claimed. There is NO auth gate — access is by knowing the
 * token — but the database function it calls (claim_submit_recipient) can only
 * ever affect the single self-claim recipient matching that token, and refuses
 * once the gift is fulfilled.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ClaimAddressInput {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export type ClaimResult = { ok: true } | { ok: false; error: string };

export async function submitClaim(
  token: string,
  input: ClaimAddressInput,
): Promise<ClaimResult> {
  if (!UUID_RE.test(token)) {
    return { ok: false, error: "This link isn't valid." };
  }
  if (!input.fullName.trim()) {
    return { ok: false, error: "Please enter your name." };
  }
  if (
    !input.addressLine1.trim() ||
    !input.city.trim() ||
    !input.postalCode.trim() ||
    !input.country.trim()
  ) {
    return {
      ok: false,
      error: "Please fill in your street address, city, postal code, and country.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_submit_recipient", {
    p_token: token,
    p_full_name: input.fullName,
    p_address_line1: input.addressLine1,
    p_address_line2: input.addressLine2,
    p_city: input.city,
    p_region: input.region,
    p_postal_code: input.postalCode,
    p_country: input.country,
  });

  if (error) {
    return { ok: false, error: "Something went wrong saving your address. Please try again." };
  }
  if (data !== true) {
    return { ok: false, error: "This link isn't valid, or the gift is already on its way." };
  }
  return { ok: true };
}
