import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import type { ProductWithRelations } from "@/types/catalog";

/**
 * A catalog box card for the dashboard grids, styled after the Figma design:
 * a large product image, the box name, a short descriptor, and a "View box"
 * affordance. Per the brief this card shows NO price. The descriptor is the
 * product's real description, falling back to its category name.
 *
 * Links to the box's catalog detail page when it has a Shopify handle,
 * otherwise to the catalog index.
 */
export function BoxCard({ product }: { product: ProductWithRelations }) {
  const href = product.shopify_handle ? `/catalog/${product.shopify_handle}` : "/catalog";
  const descriptor = product.description ?? product.category?.name ?? null;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[10px] border border-brand-border-warm bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[13/14] w-full overflow-hidden bg-brand-sand">
        <ProductImage src={product.image_url} alt={product.name} />
        {product.is_featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-yellow px-2.5 py-0.5 text-[11px] font-extrabold text-brand-navy">
            Featured
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-5 py-4">
        <p className="truncate text-[18px] font-extrabold text-brand-navy">{product.name}</p>
        {descriptor && (
          <p className="line-clamp-1 text-[13px] font-normal text-brand-ink-soft">{descriptor}</p>
        )}
        <span className="mt-1 text-[14px] font-bold text-brand-navy group-hover:underline">
          View box →
        </span>
      </div>
    </Link>
  );
}
