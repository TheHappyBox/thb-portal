"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  OrderDraftInput,
  RecipientInput,
  SavedRecipient,
} from "@/types/order";

/**
 * Order builder server actions. These are the first writes the builder makes.
 * Each action re-verifies the logged-in user (never trusting the page gate alone)
 * and relies on account-scoped RLS so a company can only ever touch its own
 * orders, items, and recipients. Errors are surfaced, never swallowed.
 */

/**
 * Create or update the buyer's DRAFT order (idempotent). On first call it inserts
 * the order and returns its id; later calls update it. The chosen boxes are synced
 * by replacing the order's line items.
 */
export async function saveOrderDraft(
  input: OrderDraftInput,
): Promise<ActionResult<{ orderId: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in to save an order." };

  // The order needs an account_id; read it from the user's profile (RLS-scoped).
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "Could not load your account." };
  }

  const orderFields = {
    mode: input.mode,
    message_card_option_id: input.messageCardOptionId,
    box_branding_option_id: input.boxBrandingOptionId,
    gift_to: input.giftTo.trim() || null,
    gift_from: input.giftFrom.trim() || null,
    shared_message: input.sharedMessage.trim() || null,
  };

  let orderId = input.orderId;
  if (orderId) {
    const { error } = await supabase
      .from("orders")
      .update(orderFields)
      .eq("id", orderId);
    if (error) return { ok: false, error: `Could not save your order: ${error.message}` };
  } else {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        account_id: profile.account_id,
        created_by: user.id,
        status: "draft",
        ...orderFields,
      })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: `Could not create your order: ${error?.message ?? "unknown error"}` };
    }
    orderId = data.id;
  }

  if (!orderId) return { ok: false, error: "Could not determine the order id." };

  // Sync line items: clear then re-insert the current selection.
  const { error: deleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId);
  if (deleteError) {
    return { ok: false, error: `Could not update order items: ${deleteError.message}` };
  }

  if (input.boxes.length > 0) {
    const rows = input.boxes.map((b) => ({
      order_id: orderId,
      product_id: b.productId,
      variant_id: b.variantId,
      quantity: b.quantity,
    }));
    const { error: insertError } = await supabase.from("order_items").insert(rows);
    if (insertError) {
      return { ok: false, error: `Could not save order items: ${insertError.message}` };
    }
  }

  return { ok: true, orderId };
}

/**
 * Sync the draft order's recipients to the given list, PRESERVING each existing
 * recipient's claim_token (and the address a self-claim recipient has already
 * entered). Existing rows (with an id) are updated, new rows inserted, and rows no
 * longer present are deleted. Returns the recipients in input order with their id
 * + claim_token, so the builder can surface claim links.
 */
export async function saveRecipients(
  orderId: string,
  recipients: RecipientInput[],
): Promise<ActionResult<{ recipients: SavedRecipient[] }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in to save recipients." };

  // Confirm the order exists for this account (RLS also enforces this).
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { ok: false, error: orderError.message };
  if (!order) return { ok: false, error: "That order could not be found." };

  // What's currently saved for this order.
  const { data: existing, error: existingError } = await supabase
    .from("recipients")
    .select("id, claim_token")
    .eq("order_id", orderId);
  if (existingError) {
    return { ok: false, error: `Could not load recipients: ${existingError.message}` };
  }
  const tokenById = new Map((existing ?? []).map((e) => [e.id, e.claim_token]));

  // Which incoming rows map to an existing row vs. are new.
  const isExisting = (r: RecipientInput) => !!r.id && tokenById.has(r.id);

  // Delete rows that are no longer in the list.
  const keepIds = new Set(recipients.filter(isExisting).map((r) => r.id as string));
  const toDelete = (existing ?? []).map((e) => e.id).filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("recipients")
      .delete()
      .eq("order_id", orderId)
      .in("id", toDelete);
    if (error) return { ok: false, error: `Could not update recipients: ${error.message}` };
  }

  // Update existing rows. Never touch claim_token/claim_status; for a self-claim
  // recipient, leave the address they entered themselves untouched.
  for (const r of recipients) {
    if (!isExisting(r)) continue;
    const fields: Record<string, unknown> = {
      full_name: r.fullName || null,
      email: r.email || null,
      message: r.message || null,
      self_claim: r.selfClaim,
    };
    if (!r.selfClaim) {
      fields.address_line1 = r.addressLine1 || null;
      fields.address_line2 = r.addressLine2 || null;
      fields.city = r.city || null;
      fields.region = r.region || null;
      fields.postal_code = r.postalCode || null;
      fields.country = r.country || null;
    }
    const { error } = await supabase
      .from("recipients")
      .update(fields)
      .eq("id", r.id as string)
      .eq("order_id", orderId);
    if (error) return { ok: false, error: `Could not save a recipient: ${error.message}` };
  }

  // Insert new rows; rows come back in insertion order.
  const newOnes = recipients.filter((r) => !isExisting(r));
  let inserted: { id: string; claim_token: string }[] = [];
  if (newOnes.length > 0) {
    const rows = newOnes.map((r) => ({
      order_id: orderId,
      full_name: r.fullName || null,
      email: r.email || null,
      address_line1: r.addressLine1 || null,
      address_line2: r.addressLine2 || null,
      city: r.city || null,
      region: r.region || null,
      postal_code: r.postalCode || null,
      country: r.country || null,
      self_claim: r.selfClaim,
      message: r.message || null,
      claim_status: "invited",
    }));
    const { data, error } = await supabase
      .from("recipients")
      .insert(rows)
      .select("id, claim_token");
    if (error || !data) {
      return { ok: false, error: `Could not save recipients: ${error?.message ?? "unknown error"}` };
    }
    inserted = data;
  }

  // Build the result in input order, threading new ids/tokens in.
  let insertIndex = 0;
  const saved: SavedRecipient[] = recipients.map((r) => {
    if (isExisting(r)) {
      return { id: r.id as string, claimToken: tokenById.get(r.id as string)!, selfClaim: r.selfClaim };
    }
    const ins = inserted[insertIndex++];
    return { id: ins.id, claimToken: ins.claim_token, selfClaim: r.selfClaim };
  });

  return { ok: true, recipients: saved };
}
