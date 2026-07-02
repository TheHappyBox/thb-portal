import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { CategoryFilter } from "@/components/category-filter";
import { ProductCard } from "@/components/product-card";
import { withAvailableVariants } from "@/lib/order-builder";
import type { Category, ProductWithRelations } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Catalog · The Happy Box",
  description: "Browse curated gift boxes to send to your team at scale.",
};

/**
 * Gated catalog grid. Only logged-in users reach it; everyone else is sent to
 * /login. Reads the global catalog (RLS allows any authenticated user to read
 * products, categories, and variants) and renders a responsive grid with a
 * category filter. Featured boxes are surfaced first.
 */
export default async function CatalogPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ category?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { category: activeSlug } = await searchParams;

  // Categories for the filter pills (and to resolve the active slug -> id).
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  if (categoriesError) {
    throw new Error(`Could not load categories: ${categoriesError.message}`);
  }

  // Resolve the selected category slug to its id so we can filter products
  // directly on category_id (exact, and avoids embedded-filter pitfalls).
  const activeCategoryId = activeSlug
    ? (categories ?? []).find((c) => c.slug === activeSlug)?.id
    : undefined;

  // Products with their category + sizes. Featured first, then alphabetical.
  let query = supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  if (activeCategoryId) {
    query = query.eq("category_id", activeCategoryId);
  }

  const { data: products, error: productsError } = await query;

  if (productsError) {
    throw new Error(`Could not load the catalog: ${productsError.message}`);
  }

  const visibleProducts = withAvailableVariants((products ?? []) as ProductWithRelations[]);

  return (
    <AppShell
      title="Curated gift boxes"
      description="Thoughtfully assembled boxes to delight your team and clients — order in bulk, choose a size, and make every gift feel personal."
    >
      <CategoryFilter
        categories={(categories ?? []) as Pick<Category, "name" | "slug">[]}
        activeSlug={activeSlug}
      />

      {visibleProducts.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          No boxes in this category yet. Try another category.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
