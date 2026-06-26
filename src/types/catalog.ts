/**
 * Shared catalog types. Hand-written to mirror the database rows in
 * supabase/migrations/0001_init.sql + 0002_product_variants.sql. (We have no
 * auto-generated Supabase types yet; when we add them, these can be replaced.)
 */

/** A themed collection in the global catalog (`public.categories`). */
export interface Category {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  created_at: string;
}

/** A gift box in the global catalog (`public.products`). */
export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  sku: string;
  /** Default size's price in whole cents (the "from" price for two-size boxes). */
  price_cents: number;
  currency: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  /** Where the product came from: synced from Shopify, or portal-native. */
  source: "shopify" | "portal";
  /** Shopify slug; also used as the catalog URL handle. Null for portal products. */
  shopify_handle: string | null;
  created_at: string;
}

/** A purchasable size of a product (`public.product_variants`). */
export interface ProductVariant {
  id: string;
  product_id: string;
  /** e.g. "Happy", "Extra Happy", "Standard". */
  name: string;
  price_cents: number;
  currency: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

/**
 * A product joined with the bits the catalog needs to render: its category and
 * its sizes. Matches the shape of the Supabase select used by the catalog pages.
 */
export interface ProductWithRelations extends Product {
  category: Pick<Category, "name" | "slug"> | null;
  variants: ProductVariant[];
}

/** Which gift add-on a branding option belongs to. */
export type BrandingGroup = "message_card" | "box_branding";

/**
 * A global gift add-on (`public.branding_options`) — a message-card or
 * box-branding choice, priced per gift (per unit) on top of the box price.
 */
export interface BrandingOption {
  id: string;
  name: string;
  group_key: BrandingGroup;
  price_cents: number;
  currency: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
