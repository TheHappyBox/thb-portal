import Link from "next/link";
import type { Category } from "@/types/catalog";

/**
 * Category filter pills for the catalog. Server component: each pill is a plain
 * link to /catalog?category=<slug> (and "All" clears the filter), so filtering
 * works without client-side JavaScript. The active pill is derived from the
 * currently-selected slug passed in by the page.
 */
export function CategoryFilter({
  categories,
  activeSlug,
}: {
  categories: Pick<Category, "name" | "slug">[];
  activeSlug?: string;
}) {
  const pill = (active: boolean) =>
    `rounded-full px-5 py-2 text-[14px] font-bold whitespace-nowrap transition ${
      active
        ? "border border-transparent bg-brand-yellow text-brand-navy"
        : "border border-brand-navy bg-white text-brand-navy hover:bg-brand-yellow/10"
    }`;

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-3">
      <Link href="/catalog" className={pill(!activeSlug)}>
        All
      </Link>
      {categories.map((c) => {
        if (!c.slug) return null;
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.slug}
            href={`/catalog?category=${c.slug}`}
            className={pill(active)}
            aria-current={active ? "page" : undefined}
          >
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
