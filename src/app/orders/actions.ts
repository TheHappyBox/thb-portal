"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  OrderDraftInput,
  RecipientInput,
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
 * Replace the draft order's recipients with the given list. Simple delete +
 * insert keeps it idempotent for a draft; when the recipient claim page is built
 * we'll switch to an upsert that preserves each recipient's claim_token.
 */
export async function saveRecipients(
  orderId: string,
  recipients: RecipientInput[],
): Promise<ActionResult<{ count: number }>> {
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

  const { error: deleteError } = await supabase
    .from("recipients")
    .delete()
    .eq("order_id", orderId);
  if (deleteError) {
    return { ok: false, error: `Could not update recipients: ${deleteError.message}` };
  }

  if (recipients.length > 0) {
    const rows = recipients.map((r) => ({
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
    const { error: insertError } = await supabase.from("recipients").insert(rows);
    if (insertError) {
      return { ok: false, error: `Could not save recipients: ${insertError.message}` };
    }
  }

  return { ok: true, count: recipients.length };
}
