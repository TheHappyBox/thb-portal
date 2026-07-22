"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import { BoxDetailModal } from "@/components/catalog/box-detail-modal";
import type { ProductWithRelations } from "@/types/catalog";

/**
 * Client wrapper for the catalog grid. Owns which box's detail popup is open, so
 * "View details" opens the modal instantly without a page load. `initialOpenHandle`
 * (from ?box=<handle>) auto-opens a box on load — that's how a direct link to a
 * box resolves after /catalog/[handle] redirects here.
 */
export function CatalogGrid({
  products,
  initialOpenHandle,
}: {
  products: ProductWithRelations[];
  initialOpenHandle?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(
    () => products.find((p) => p.shopify_handle === initialOpenHandle)?.id ?? null,
  );
  const openProduct = products.find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onView={() => setOpenId(product.id)} />
        ))}
      </div>

      {openProduct && <BoxDetailModal product={openProduct} onClose={() => setOpenId(null)} />}
    </>
  );
}
