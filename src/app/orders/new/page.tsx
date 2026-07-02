import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { OrderBuilder } from "@/components/order-builder/order-builder";
import { defaultVariant } from "@/lib/pricing";
import { withAvailableVariants } from "@/lib/order-builder";
import { loadDraftBuilderState } from "@/lib/order-queries";
import type { BrandingOption, ProductWithRelations } from "@/types/catalog";
import type { BuilderState, SelectedBox } from "@/types/order";

export const metadata: Metadata = {
  title: "New order · The Happy Box",
  description: "Build a corporate gift order.",
};

/**
 * Gated order builder. Two entry points land here and share the same flow:
 *  - from scratch: /orders/new  (mode is asked first)
 *  - from a box:   /orders/new?box=<shopify_handle>&variant=<variantId>
 *    (the box is pre-filled, then mode is asked)
 *
 * Catalog data is fetched server-side (RLS allows any logged-in user to read it)
 * and handed to the client builder, which owns the in-progress state.
 */
export default async function NewOrderPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ box?: string; variant?: string; draft?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: productData, error } = await supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Could not load the catalog: ${error.message}`);
  }

  const products = withAvailableVariants((productData ?? []) as ProductWithRelations[]);

  // Global gift add-on catalog (RLS allows any logged-in user to read it).
  const { data: brandingData, error: brandingError } = await supabase
    .from("branding_options")
    .select("*")
    .eq("is_active", true)
    .order("group_key", { ascending: true })
    .order("sort_order", { ascending: true });

  if (brandingError) {
    throw new Error(`Could not load gift options: ${brandingError.message}`);
  }

  const brandingOptions = (brandingData ?? []) as BrandingOption[];

  const { box: boxHandle, variant: variantId, draft } = await searchParams;

  // Resume flow: ?draft=<orderId> reopens a saved draft pre-filled. The draft is
  // loaded account-scoped (RLS); a missing/foreign order sends them to the list,
  // and a non-draft (e.g. paid) order is view-only so we redirect to its detail.
  let initialDraft: BuilderState | null = null;
  if (draft) {
    const resumed = await loadDraftBuilderState(draft);
    if (!resumed) {
      redirect("/orders");
    } else if (resumed.status !== "draft") {
      redirect(`/orders/${draft}`);
    } else {
      initialDraft = resumed.state;
    }
  }

  // Resolve an entry-point box (?box=&variant=) into a SelectedBox. If the handle
  // or variant doesn't match a real, active product, ignore it silently. Skipped
  // when resuming a draft (the draft already carries its boxes).
  let initialBox: SelectedBox | null = null;
  if (!initialDraft && boxHandle) {
    const product = products.find((p) => p.shopify_handle === boxHandle);
    if (product) {
      const variant =
        product.variants.find((v) => v.id === variantId) ??
        defaultVariant(product.variants);
      if (variant) {
        initialBox = { productId: product.id, variantId: variant.id, quantity: 1 };
      }
    }
  }

  return (
    <AppShell title="Build your order" description="Choose boxes, add gift options, and add recipients.">
      <div className="mx-auto max-w-4xl">
        <OrderBuilder
          products={products}
          brandingOptions={brandingOptions}
          initialBox={initialBox}
          initialDraft={initialDraft}
        />
      </div>
    </AppShell>
  );
}
