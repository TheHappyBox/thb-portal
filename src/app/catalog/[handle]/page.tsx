import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { ProductImage } from "@/components/product-image";
import { ProductSizeSelector } from "@/components/product-size-selector";
import { sortedVariants } from "@/lib/pricing";
import type { ProductWithRelations } from "@/types/catalog";

/**
 * Gated product detail page, reached via /catalog/<shopify_handle>. Shows the box
 * hero (placeholder image, category, name, description) and a size selector where
 * the shopper picks Happy / Extra Happy (or sees the single price for fixed boxes).
 */

async function getProduct(handle: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("shopify_handle", handle)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load this box: ${error.message}`);
  }

  return (data as ProductWithRelations | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Box not found · The Happy Box" };
  return {
    title: `${product.name} · The Happy Box`,
    description: product.description ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) {
    notFound();
  }

  // Only show purchasable sizes (the Shopify sync retires superseded variants).
  const variants = sortedVariants(product.variants.filter((v) => v.available));

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
          <ProductImage src={product.image_url} alt={product.name} />
          {product.is_featured && (
            <span className="absolute left-3 top-3 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground shadow-sm">
              Featured
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {product.category?.name && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.category.name}
            </span>
          )}
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            {product.name}
          </h1>
          {product.description && <p className="text-muted-foreground">{product.description}</p>}

          <div className="mt-2 rounded-xl border border-border bg-card p-5">
            <ProductSizeSelector variants={variants} shopifyHandle={product.shopify_handle} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
