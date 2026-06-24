import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { CategoryFilter } from "@/components/category-filter";
import { ProductCard } from "@/components/product-card";
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

  const visibleProducts = (products ?? []) as ProductWithRelations[];

  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-brand-muted transition hover:text-brand-ink"
          >
            ← Dashboard
          </Link>
          <SignOutButton />
        </header>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-wide text-brand-gold">
            The Happy Box
          </span>
          <h1 className="text-3xl font-semibold text-brand-ink sm:text-4xl">
            Curated gift boxes
          </h1>
          <p className="max-w-2xl text-brand-muted">
            Thoughtfully assembled boxes to delight your team and clients — order
            in bulk, choose a size, and make every gift feel personal.
          </p>
        </div>

        <CategoryFilter
          categories={(categories ?? []) as Pick<Category, "name" | "slug">[]}
          activeSlug={activeSlug}
        />

        {visibleProducts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-sand bg-white p-8 text-center text-brand-muted">
            No boxes in this category yet. Try another category.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
