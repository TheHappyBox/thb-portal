import Link from "next/link";
import type { ProductWithRelations } from "@/types/catalog";
import { priceLabel, sortedVariants } from "@/lib/pricing";
import { ProductImage } from "@/components/product-image";

/**
 * A single gift box in the catalog grid. The whole card links to the product's
 * detail page (keyed by its Shopify handle). Shows the placeholder image, a
 * "Featured" badge where relevant, the category, name, short description, and
 * the price label ("From $99" for multi-size, flat price for single-size).
 */
export function ProductCard({ product }: { product: ProductWithRelations }) {
  const variants = sortedVariants(product.variants);

  return (
    <Link
      href={`/catalog/${product.shopify_handle}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-brand-sand bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-ink/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProductImage src={product.image_url} alt={product.name} />
        {product.is_featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-gold px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category?.name && (
          <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            {product.category.name}
          </span>
        )}
        <h3 className="text-lg font-semibold text-brand-ink">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-sm text-brand-muted">
            {product.description}
          </p>
        )}
        <p className="mt-auto pt-2 text-base font-semibold text-brand-berry">
          {priceLabel(variants)}
        </p>
      </div>
    </Link>
  );
}
