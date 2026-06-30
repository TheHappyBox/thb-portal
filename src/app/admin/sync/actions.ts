"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { fetchActiveProducts, getAdminToken, shouldAbortReconcile } from "@/lib/shopify";

export interface SyncSummary {
  added: number;
  updated: number;
  hidden_products: number;
  hidden_variants: number;
  total_synced: number;
}

export type SyncState =
  | { status: "success"; summary: SyncSummary; message: string }
  | { status: "error"; message: string }
  | undefined;

/**
 * Manual platform-level catalog sync: read ACTIVE products from Shopify
 * (read-only) and reconcile them into our catalog atomically. Safety first —
 * any fetch error or an implausibly-small result aborts WITHOUT touching the
 * catalog. Gated to THB platform admins (re-checked here, not just on the page).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState calls with (prevState, formData); this action needs neither
export async function syncShopifyCatalog(_prev: SyncState, _formData: FormData): Promise<SyncState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdmin(user.email)) {
    return { status: "error", message: "Not authorized." };
  }

  // 1) Read from Shopify. Any error here → abort, change nothing.
  let products;
  try {
    const token = await getAdminToken();
    products = await fetchActiveProducts(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: "error", message: `Shopify fetch failed — catalog left unchanged. ${message}` };
  }

  const admin = createAdminClient();

  // 2) Safety gate: compare against how many active synced products we have now.
  const { count: existingActive, error: countError } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("source", "shopify")
    .eq("is_active", true);
  if (countError) {
    return { status: "error", message: `Could not read current catalog — aborted, nothing changed. ${countError.message}` };
  }

  const guard = shouldAbortReconcile(products.length, existingActive ?? 0);
  if (guard.abort) {
    return { status: "error", message: `${guard.reason} Catalog left unchanged.` };
  }

  // 3) Reconcile atomically (the DB function is one transaction — a failure rolls back).
  const { data: summary, error: rpcError } = await admin.rpc("sync_shopify_catalog", {
    payload: { products },
  });
  if (rpcError) {
    return { status: "error", message: `Reconcile failed — catalog left unchanged. ${rpcError.message}` };
  }

  revalidatePath("/catalog");
  revalidatePath("/admin/sync");

  const s = summary as SyncSummary;
  return {
    status: "success",
    summary: s,
    message: `Synced ${s.total_synced} active Shopify products — ${s.added} added, ${s.updated} updated, ${s.hidden_products} products hidden, ${s.hidden_variants} variants retired.`,
  };
}
