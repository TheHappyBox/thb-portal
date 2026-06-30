-- =============================================================================
-- THB Corporate Gifting Portal — Shopify catalog sync (inbound, platform-level).
-- Apply via `npm run db:push`, AFTER 0001..0007. Additive and safe to re-run.
--
-- Shopify is the single source of truth for the catalog. The manual "Sync now"
-- fetches ACTIVE products (read-only) and reconciles them into our catalog via
-- the sync_shopify_catalog() function below — atomically, idempotently, and
-- "hide, don't destroy": products/variants that disappear from Shopify are marked
-- inactive/unavailable, never hard-deleted (so order history stays intact).
-- =============================================================================

-- =============================================================================
-- 1. product_variants — stable Shopify key + an availability flag
--  * shopify_variant_id — the Shopify variant's numeric id, the STABLE match key
--    (Shopify variant display names vary and change; ids don't).
--  * available — mirrors Shopify availableForSale. Also how a superseded/vanished
--    variant is retired (available = false) without deleting it.
-- =============================================================================
alter table public.product_variants
  add column if not exists shopify_variant_id text;

alter table public.product_variants
  add column if not exists available boolean not null default true;

-- One portal variant per Shopify variant (only when we have an id).
create unique index if not exists idx_product_variants_shopify_variant_id
  on public.product_variants (product_id, shopify_variant_id)
  where shopify_variant_id is not null;

-- Drop the old (product_id, name) uniqueness: a retired legacy variant and the
-- new Shopify variant can legitimately share a name (e.g. "Standard"), with the
-- old one hidden (available = false). Variant identity is now the Shopify id.
alter table public.product_variants
  drop constraint if exists product_variants_product_id_name_key;

-- =============================================================================
-- 2. sync_shopify_catalog(payload) — the whole reconcile, in ONE transaction.
-- Returns a summary {added, updated, hidden_products, hidden_variants, total}.
-- Called by the platform sync action via the SECRET-key admin client (writes to
-- the global catalog already happen that way; there is no client RLS to loosen).
--
-- payload shape:
--   { "products": [ {
--       handle, title, description, image_url, sku, price_cents,
--       variants: [ { shopify_variant_id, name, price_cents, available,
--                     sort_order, is_default } ]
--   } ] }
-- =============================================================================
create or replace function public.sync_shopify_catalog(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added            integer := 0;
  v_updated          integer := 0;
  v_hidden_products  integer := 0;
  v_hidden_variants  integer := 0;
  v_retired          integer := 0;
  v_prod             jsonb;
  v_var              jsonb;
  v_product_id       uuid;
  v_inserted         boolean;
  v_handle           text;
  v_synced_handles   text[] := '{}';
  v_variant_ids      text[];
  v_default_id       text;
begin
  for v_prod in select value from jsonb_array_elements(payload->'products') as t(value)
  loop
    v_handle := v_prod->>'handle';
    v_synced_handles := array_append(v_synced_handles, v_handle);

    -- ---- Upsert the product by its Shopify handle ----
    insert into public.products
      (name, sku, price_cents, currency, description, image_url, is_active, source, shopify_handle)
    values (
      v_prod->>'title',
      v_prod->>'sku',
      (v_prod->>'price_cents')::integer,
      'CAD',
      v_prod->>'description',
      v_prod->>'image_url',
      true,
      'shopify',
      v_handle
    )
    on conflict (shopify_handle) where shopify_handle is not null
    do update set
      name        = excluded.name,
      price_cents = excluded.price_cents,
      currency    = 'CAD',
      description = excluded.description,
      image_url   = excluded.image_url,
      is_active   = true,
      source      = 'shopify'
    returning id, (xmax = 0) into v_product_id, v_inserted;

    if v_inserted then
      v_added := v_added + 1;
    else
      v_updated := v_updated + 1;
    end if;

    -- ---- Upsert this product's variants by shopify_variant_id ----
    v_variant_ids := '{}';
    v_default_id := null;
    for v_var in select value from jsonb_array_elements(v_prod->'variants') as t(value)
    loop
      v_variant_ids := array_append(v_variant_ids, v_var->>'shopify_variant_id');
      if (v_var->>'is_default')::boolean then
        v_default_id := v_var->>'shopify_variant_id';
      end if;

      insert into public.product_variants
        (product_id, name, price_cents, currency, sort_order, is_default, available, shopify_variant_id)
      values (
        v_product_id,
        v_var->>'name',
        (v_var->>'price_cents')::integer,
        'CAD',
        (v_var->>'sort_order')::integer,
        false,  -- defaults are set in a dedicated step to satisfy the one-default index
        (v_var->>'available')::boolean,
        v_var->>'shopify_variant_id'
      )
      on conflict (product_id, shopify_variant_id) where shopify_variant_id is not null
      do update set
        name        = excluded.name,
        price_cents = excluded.price_cents,
        currency    = 'CAD',
        sort_order  = excluded.sort_order,
        available   = excluded.available;
    end loop;

    -- Retire variants not in the current Shopify set (legacy seeded / vanished).
    -- Only touch ones still available, so the count reflects what was NEWLY hidden
    -- and a repeat sync is a true no-op.
    update public.product_variants
      set available = false, is_default = false
      where product_id = v_product_id
        and available = true
        and (shopify_variant_id is null or not (shopify_variant_id = any (v_variant_ids)));
    get diagnostics v_retired = row_count;
    v_hidden_variants := v_hidden_variants + v_retired;

    -- Set exactly one default (clear all first to never have two true at once).
    update public.product_variants set is_default = false where product_id = v_product_id;
    if v_default_id is not null then
      update public.product_variants
        set is_default = true
        where product_id = v_product_id and shopify_variant_id = v_default_id;
    end if;
  end loop;

  -- ---- Hide products that vanished from Shopify (active, source=shopify, not synced) ----
  update public.products
    set is_active = false
    where source = 'shopify'
      and is_active = true
      and (shopify_handle is null or not (shopify_handle = any (v_synced_handles)));
  get diagnostics v_hidden_products = row_count;

  return jsonb_build_object(
    'added', v_added,
    'updated', v_updated,
    'hidden_products', v_hidden_products,
    'hidden_variants', v_hidden_variants,
    'total_synced', coalesce(array_length(v_synced_handles, 1), 0)
  );
end;
$$;

revoke all on function public.sync_shopify_catalog(jsonb) from public;
grant execute on function public.sync_shopify_catalog(jsonb) to service_role;
