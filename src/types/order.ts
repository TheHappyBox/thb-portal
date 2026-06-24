import type { ProductVariant, ProductWithRelations } from "@/types/catalog";

/**
 * Order-builder types. This slice keeps the in-progress order entirely on the
 * client (sessionStorage) — nothing is written to the database yet. When the
 * save/submit step is built, `mode` becomes orders.mode and `boxes` become rows
 * in an order_items table.
 */

/** Single recipient vs many recipients — set by the "Recipients count" step. */
export type OrderMode = "single" | "multiple";

/** One chosen box: a product, a chosen size (variant), and how many. */
export interface SelectedBox {
  productId: string;
  variantId: string;
  quantity: number;
}

/**
 * The whole in-progress order. `mode` and `boxes` are INDEPENDENT: either can be
 * set first depending on how the buyer entered the builder.
 */
export interface BuilderState {
  mode: OrderMode | null;
  boxes: SelectedBox[];
}

/**
 * A SelectedBox resolved against the catalog for display — the box joined to its
 * product and the specific chosen variant. Used by the box step and the summary.
 */
export interface SelectedBoxView extends SelectedBox {
  product: ProductWithRelations;
  variant: ProductVariant;
  /** quantity × variant.price_cents */
  lineTotalCents: number;
}
