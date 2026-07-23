"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { brandingById, orderTotalCents, resolveBoxes } from "@/lib/order-builder";
import type { ActionResult } from "@/types/order";
import type { BrandingOption, ProductWithRelations } from "@/types/catalog";

/**
 * Checkout server action. Turns the buyer's saved DRAFT order into a Stripe
 * HOSTED Checkout Session and returns its URL; the client then sends the buyer
 * to Stripe's own page (card details never touch our app).
 *
 * Trust nothing from the browser: the only input is the order id. We re-verify
 * the user, load the order under account-scoped RLS (a company can only check out
 * its own order), and RECOMPUTE the amount server-side from the saved line items
 * using the central pricing helper. The webhook (not the redirect) is what marks
 * the order paid — see src/app/api/stripe/webhook/route.ts.
 */
export async function startCheckout(
  orderId: string,
): Promise<ActionResult<{ url: string }>> {
  if (!orderId) return { ok: false, error: "Missing order." };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in to check out." };

  // Load the order (RLS scopes this to the buyer's own account).
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, message_card_option_id, box_branding_option_id, stripe_checkout_session_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { ok: false, error: `Could not load your order: ${orderError.message}` };
  if (!order) return { ok: false, error: "That order could not be found." };
  if (order.status === "paid") {
    return { ok: false, error: "This order has already been paid." };
  }
  if (order.status !== "draft") {
    return { ok: false, error: "This order can no longer be checked out." };
  }

  // The chosen boxes (line items) for this order.
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);
  if (itemsError) return { ok: false, error: `Could not load order items: ${itemsError.message}` };
  if (!items || items.length === 0) {
    return { ok: false, error: "Your order has no boxes yet." };
  }

  // Resolve boxes against the live catalog so we price from current variant
  // prices (global, RLS-readable by any logged-in user).
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("is_active", true);
  if (productError) return { ok: false, error: `Could not load the catalog: ${productError.message}` };
  const products = (productData ?? []) as ProductWithRelations[];

  const boxes = items.map((i) => ({
    productId: i.product_id,
    variantId: i.variant_id,
    quantity: i.quantity,
  }));
  const views = resolveBoxes(boxes, products);
  if (views.length === 0) {
    return { ok: false, error: "Your order's boxes are no longer available." };
  }

  // Resolve the two branding choices (global catalog) for the per-gift add-ons.
  const brandingIds = [order.message_card_option_id, order.box_branding_option_id].filter(
    (id): id is string => typeof id === "string",
  );
  let brandingOptions: BrandingOption[] = [];
  if (brandingIds.length > 0) {
    const { data: brandingData, error: brandingError } = await supabase
      .from("branding_options")
      .select("*")
      .in("id", brandingIds);
    if (brandingError) {
      return { ok: false, error: `Could not load gift options: ${brandingError.message}` };
    }
    brandingOptions = (brandingData ?? []) as BrandingOption[];
  }
  const messageCard = brandingById(brandingOptions, order.message_card_option_id);
  const boxBranding = brandingById(brandingOptions, order.box_branding_option_id);

  // The single source of truth for the charged amount (whole cents).
  const totalCents = orderTotalCents(views, messageCard, boxBranding);
  if (totalCents <= 0) {
    return { ok: false, error: "This order's total is zero — nothing to charge." };
  }

  const currency = (views[0]?.variant.currency ?? "CAD").toLowerCase();
  const totalUnits = views.reduce((sum, v) => sum + v.quantity, 0);
  const description = `${totalUnits} gift ${totalUnits === 1 ? "box" : "boxes"}`;

  // Stripe needs absolute return URLs. In production NEXT_PUBLIC_SITE_URL MUST be
  // set to the deployed origin — falling back to localhost would silently send a
  // paying customer to a dead address. Only development is allowed that fallback.
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!configuredSiteUrl && process.env.NODE_ENV === "production") {
    return {
      ok: false,
      error: "Checkout is temporarily unavailable (site URL not configured). Please try again later.",
    };
  }
  const siteUrl = configuredSiteUrl ?? "http://localhost:3000";

  let checkoutUrl: string | null = null;
  let sessionId: string;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // One line item equal to the server-computed total, so the charge can never
      // drift from our pricing helper.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: totalCents,
            product_data: {
              name: "The Happy Box — Gift order",
              description,
            },
          },
        },
      ],
      // Identify the order on the event we get back via the webhook.
      client_reference_id: orderId,
      metadata: { order_id: orderId },
      success_url: `${siteUrl}/orders/${orderId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/orders/new`,
    });
    checkoutUrl = session.url;
    sessionId = session.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Could not start checkout: ${message}` };
  }

  if (!checkoutUrl) {
    return { ok: false, error: "Stripe did not return a checkout URL." };
  }

  // Snapshot the charged amount + the session id on the order (RLS-scoped update
  // on the buyer's own order). The webhook will later flip status to 'paid'.
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      stripe_checkout_session_id: sessionId,
      amount_total_cents: totalCents,
    })
    .eq("id", orderId);
  if (updateError) {
    return { ok: false, error: `Could not save checkout details: ${updateError.message}` };
  }

  return { ok: true, url: checkoutUrl };
}
