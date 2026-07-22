import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPortalChrome } from "@/lib/portal-chrome";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalTopbar } from "@/components/portal/portal-topbar";
import { CategoryFilter } from "@/components/category-filter";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { withAvailableVariants } from "@/lib/order-builder";
import type { Category, ProductWithRelations } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Catalog · The Happy Box",
  description: "Browse curated gift boxes to send to your team at scale.",
};

/**
 * Gated catalog grid, rebuilt to match the Figma redesign: the portal shell
 * (sidebar + topbar) with a category-pill filter and a responsive box grid.
 * Reads the global catalog (RLS allows any logged-in user to read products,
 * categories, and variants). Featured boxes are surfaced first.
 */
export default async function CatalogPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ category?: string; box?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { category: activeSlug, box: openHandle } = await searchParams;
  const chrome = await loadPortalChrome();

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
    <div className="flex min-h-screen bg-brand-cream text-brand-navy">
      <PortalSidebar active="catalog" ordersBadge={chrome.draftBadge} />

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalTopbar
          title="Browse catalog"
          userName={chrome.userName}
          companyName={chrome.companyName}
          email={chrome.email}
          initials={chrome.initials}
        />

        <main className="flex flex-col gap-8 px-10 pb-16 pt-2">
          <CategoryFilter
            categories={(categories ?? []) as Pick<Category, "name" | "slug">[]}
            activeSlug={activeSlug}
          />

          {visibleProducts.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-brand-border-warm bg-white p-8 text-center text-[14px] text-brand-ink-soft">
              No boxes in this category yet. Try another category.
            </p>
          ) : (
            <CatalogGrid products={visibleProducts} initialOpenHandle={openHandle} />
          )}
        </main>
      </div>
    </div>
  );
}
