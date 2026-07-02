import Link from "next/link";
import type { ProductWithRelations } from "@/types/catalog";
import { defaultVariant, priceLabel, sortedVariants } from "@/lib/pricing";
import { ProductImage } from "@/components/product-image";

/**
 * A single gift box in the catalog grid. The image + info link to the product's
 * detail page (keyed by its Shopify handle); a separate "Start an order" action
 * jumps straight into the order builder pre-filled with this box at its default
 * size. (The two actions are siblings — not nested links — to keep valid markup.)
 */
export function ProductCard({ product }: { product: ProductWithRelations }) {
  const variants = sortedVariants(product.variants);
  const defaultV = defaultVariant(variants);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-foreground/5">
      <Link href={`/catalog/${product.shopify_handle}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden">
          <ProductImage src={product.image_url} alt={product.name} />
          {product.is_featured && (
            <span className="absolute left-3 top-3 rounded-full bg-muted-foreground px-2.5 py-1 text-xs font-medium text-white shadow-sm">
              Featured
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          {product.category?.name && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.category.name}
            </span>
          )}
          <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
          {product.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {product.description}
            </p>
          )}
          <p className="mt-auto pt-2 text-base font-semibold text-primary">
            {priceLabel(variants)}
          </p>
        </div>
      </Link>

      {defaultV && (
        <div className="px-4 pb-4">
          <Link
            href={`/orders/new?box=${product.shopify_handle}&variant=${defaultV.id}`}
            className="block rounded-md border border-primary px-4 py-2 text-center text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
          >
            Start an order with this box
          </Link>
        </div>
      )}
    </div>
  );
}
