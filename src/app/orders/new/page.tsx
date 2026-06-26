import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { OrderBuilder } from "@/components/order-builder/order-builder";
import { defaultVariant } from "@/lib/pricing";
import type { BrandingOption, ProductWithRelations } from "@/types/catalog";
import type { SelectedBox } from "@/types/order";

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
  searchParams: Promise<{ box?: string; variant?: string }>;
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

  const products = (productData ?? []) as ProductWithRelations[];

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

  // Resolve an entry-point box (?box=&variant=) into a SelectedBox. If the handle
  // or variant doesn't match a real, active product, ignore it silently.
  const { box: boxHandle, variant: variantId } = await searchParams;
  let initialBox: SelectedBox | null = null;
  if (boxHandle) {
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
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/catalog"
            className="text-sm text-brand-muted transition hover:text-brand-ink"
          >
            ← Catalog
          </Link>
          <SignOutButton />
        </header>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-wide text-brand-gold">
            New order
          </span>
          <h1 className="text-3xl font-semibold text-brand-ink sm:text-4xl">
            Build your order
          </h1>
        </div>

        <OrderBuilder
          products={products}
          brandingOptions={brandingOptions}
          initialBox={initialBox}
        />
      </div>
    </main>
  );
}
