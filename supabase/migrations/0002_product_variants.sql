-- =============================================================================
-- THB Corporate Gifting Portal — product source tracking + size variants.
-- Apply via Supabase Dashboard -> SQL Editor -> Run, AFTER 0001_init.sql.
--
-- What this adds:
--  1. products.source        — where a product came from ('shopify' | 'portal').
--     Today everything is seeded as 'shopify' (mirrors The Happy Box's real
--     catalog). Later, accounts will get their own 'portal'-native products.
--  2. products.shopify_handle — the Shopify slug, so the FUTURE live Shopify sync
--     (a separate feature) can reconcile each box with its Shopify record.
--  3. product_variants        — the box SIZES. A box like "Comfort & Essentials"
--     is not one price; it offers a "Happy" size and an "Extra Happy" size. Each
--     size is its own row here. Single-price boxes get exactly one variant.
--
-- This migration is additive and safe to re-run during development.
-- =============================================================================

-- =============================================================================
-- 1. EXTEND products (keep all existing columns)
-- =============================================================================
alter table public.products
  add column if not exists source text not null default 'portal'
    check (source in ('shopify', 'portal'));

alter table public.products
  add column if not exists shopify_handle text;

-- A Shopify handle must be unique, but only when present (portal-native products
-- have no handle). A partial unique index gives us "unique where not null".
create unique index if not exists idx_products_shopify_handle
  on public.products (shopify_handle)
  where shopify_handle is not null;

-- =============================================================================
-- 2. NEW TABLE: product_variants (the box sizes)
-- Prices are whole cents to keep money math exact (9900 = CA$99.00), matching
-- the products.price_cents convention from 0001_init.sql.
-- =============================================================================
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  name        text not null,            -- e.g. 'Happy', 'Extra Happy', 'Standard'
  price_cents integer not null check (price_cents >= 0),
  currency    text not null default 'CAD',
  sort_order  integer not null default 0,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  -- Natural key: a product can't have two sizes with the same name. Also lets the
  -- seed file upsert variants idempotently (on conflict (product_id, name)).
  unique (product_id, name)
);

-- Fast lookup of a product's sizes.
create index if not exists idx_product_variants_product_id
  on public.product_variants (product_id);

-- Enforce at most one default size per product.
create unique index if not exists idx_product_variants_one_default
  on public.product_variants (product_id)
  where is_default;

-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- Variants are part of the GLOBAL catalog: readable by any logged-in user, just
-- like products and categories (see 0001_init.sql). No insert/update/delete
-- policy — writes happen only via the secret-key admin client / SQL Editor.
-- =============================================================================
alter table public.product_variants enable row level security;

drop policy if exists product_variants_select_all on public.product_variants;
create policy product_variants_select_all on public.product_variants
  for select to authenticated
  using (true);
