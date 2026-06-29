import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  brandingById,
  draftToBuilderState,
  orderTotalCents,
  resolveBoxes,
} from "@/lib/order-builder";
import type { BrandingOption, ProductWithRelations } from "@/types/catalog";
import type { BuilderState, SelectedBoxView } from "@/types/order";

/**
 * Read-side loaders for the buyer's own orders. Every query runs through the
 * account-scoped Supabase client, so RLS guarantees a company only ever sees its
 * OWN orders/items/recipients — there is no cross-account access here. Pages stay
 * thin (auth gate + render); the data shaping + pricing live in one place.
 *
 * Totals follow one rule everywhere: a PAID order shows its captured snapshot
 * (amount_total_cents); a draft is computed live from the central pricing helper
 * so it stays correct as the buyer edits it.
 */

export interface OrderListRow {
  id: string;
  status: string;
  createdAt: string;
  totalCents: number;
  currency: string;
  recipientCount: number;
  claimedCount: number;
}

export interface OrderDetailRecipient {
  fullName: string | null;
  email: string | null;
  claimStatus: string;
  selfClaim: boolean;
  claimToken: string | null;
  hasAddress: boolean;
  city: string | null;
  region: string | null;
}

export interface OrderDetail {
  id: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  mode: string | null;
  sharedMessage: string | null;
  totalCents: number;
  amountTotalCents: number | null;
  currency: string;
  views: SelectedBoxView[];
  messageCard?: BrandingOption;
  boxBranding?: BrandingOption;
  recipients: OrderDetailRecipient[];
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Load the active product catalog + all branding options once, for resolving
 * boxes and add-ons. Branding is loaded unfiltered so a draft that references a
 * now-inactive option still resolves its price.
 */
async function loadCatalog(supabase: SupabaseServerClient): Promise<{
  products: ProductWithRelations[];
  brandingOptions: BrandingOption[];
}> {
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("is_active", true);
  if (productError) {
    throw new Error(`Could not load the catalog: ${productError.message}`);
  }

  const { data: brandingData, error: brandingError } = await supabase
    .from("branding_options")
    .select("*");
  if (brandingError) {
    throw new Error(`Could not load gift options: ${brandingError.message}`);
  }

  return {
    products: (productData ?? []) as ProductWithRelations[],
    brandingOptions: (brandingData ?? []) as BrandingOption[],
  };
}

/** Pick the displayed total: snapshot for paid orders, computed for drafts. */
function pickTotalCents(
  status: string,
  amountTotalCents: number | null,
  views: SelectedBoxView[],
  messageCard?: BrandingOption,
  boxBranding?: BrandingOption,
): number {
  if (status === "paid" && amountTotalCents != null) return amountTotalCents;
  return orderTotalCents(views, messageCard, boxBranding);
}

/** The logged-in company's orders, most recent first (account-scoped by RLS). */
export async function loadAccountOrders(): Promise<OrderListRow[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, amount_total_cents, message_card_option_id, box_branding_option_id",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load your orders: ${error.message}`);
  if (!orders || orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const { products, brandingOptions } = await loadCatalog(supabase);

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, product_id, variant_id, quantity")
    .in("order_id", ids);
  if (itemsError) throw new Error(`Could not load order items: ${itemsError.message}`);

  const { data: recipients, error: recipientsError } = await supabase
    .from("recipients")
    .select("order_id, claim_status")
    .in("order_id", ids);
  if (recipientsError) {
    throw new Error(`Could not load recipients: ${recipientsError.message}`);
  }

  // Group items + recipients by order for in-memory aggregation (no schema change).
  const itemsByOrder = new Map<string, { product_id: string; variant_id: string; quantity: number }[]>();
  for (const it of items ?? []) {
    const list = itemsByOrder.get(it.order_id) ?? [];
    list.push(it);
    itemsByOrder.set(it.order_id, list);
  }
  const recipsByOrder = new Map<string, { claim_status: string }[]>();
  for (const r of recipients ?? []) {
    const list = recipsByOrder.get(r.order_id) ?? [];
    list.push(r);
    recipsByOrder.set(r.order_id, list);
  }

  return orders.map((o) => {
    const boxes = (itemsByOrder.get(o.id) ?? []).map((i) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      quantity: i.quantity,
    }));
    const views = resolveBoxes(boxes, products);
    const messageCard = brandingById(brandingOptions, o.message_card_option_id);
    const boxBranding = brandingById(brandingOptions, o.box_branding_option_id);
    const totalCents = pickTotalCents(o.status, o.amount_total_cents, views, messageCard, boxBranding);

    const rs = recipsByOrder.get(o.id) ?? [];
    return {
      id: o.id,
      status: o.status,
      createdAt: o.created_at,
      totalCents,
      currency: views[0]?.variant.currency ?? "CAD",
      recipientCount: rs.length,
      claimedCount: rs.filter((r) => r.claim_status === "claimed").length,
    };
  });
}

/** One order's full detail, or null if it isn't the buyer's (RLS) / missing. */
export async function loadOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, paid_at, mode, shared_message, amount_total_cents, message_card_option_id, box_branding_option_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Could not load your order: ${error.message}`);
  if (!order) return null;

  const { products, brandingOptions } = await loadCatalog(supabase);

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);
  if (itemsError) throw new Error(`Could not load order items: ${itemsError.message}`);

  const boxes = (items ?? []).map((i) => ({
    productId: i.product_id,
    variantId: i.variant_id,
    quantity: i.quantity,
  }));
  const views = resolveBoxes(boxes, products);
  const messageCard = brandingById(brandingOptions, order.message_card_option_id);
  const boxBranding = brandingById(brandingOptions, order.box_branding_option_id);
  const totalCents = pickTotalCents(
    order.status,
    order.amount_total_cents,
    views,
    messageCard,
    boxBranding,
  );

  const { data: recipientsData, error: recipientsError } = await supabase
    .from("recipients")
    .select("full_name, email, claim_status, self_claim, claim_token, address_line1, city, region")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (recipientsError) {
    throw new Error(`Could not load recipients: ${recipientsError.message}`);
  }

  const recipients: OrderDetailRecipient[] = (recipientsData ?? []).map((r) => ({
    fullName: r.full_name,
    email: r.email,
    claimStatus: r.claim_status,
    selfClaim: r.self_claim === true,
    claimToken: r.claim_token,
    hasAddress: Boolean(r.address_line1 && r.city),
    city: r.city,
    region: r.region,
  }));

  return {
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    mode: order.mode,
    sharedMessage: order.shared_message,
    totalCents,
    amountTotalCents: order.amount_total_cents,
    currency: views[0]?.variant.currency ?? "CAD",
    views,
    messageCard,
    boxBranding,
    recipients,
  };
}

/**
 * Load a saved draft mapped into BuilderState so the builder can resume it.
 * Returns the order's status too, so the caller can refuse to resume a non-draft
 * (e.g. a paid order is view-only). Null when the order isn't the buyer's.
 */
export async function loadDraftBuilderState(
  orderId: string,
): Promise<{ status: string; state: BuilderState } | null> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status, mode, message_card_option_id, box_branding_option_id, shared_message")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the draft: ${error.message}`);
  if (!order) return null;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);
  if (itemsError) throw new Error(`Could not load order items: ${itemsError.message}`);

  const { data: recipients, error: recipientsError } = await supabase
    .from("recipients")
    .select(
      "id, claim_token, full_name, email, address_line1, address_line2, city, region, postal_code, country, self_claim, message",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (recipientsError) {
    throw new Error(`Could not load recipients: ${recipientsError.message}`);
  }

  return {
    status: order.status,
    state: draftToBuilderState(order, items ?? [], recipients ?? []),
  };
}
