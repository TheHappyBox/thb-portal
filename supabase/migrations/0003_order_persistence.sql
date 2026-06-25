-- =============================================================================
-- THB Corporate Gifting Portal — order persistence: branding options, order
-- line items, recipients, and the order's gift choices. Apply via Supabase
-- Dashboard -> SQL Editor -> Run, AFTER 0001_init.sql and 0002_product_variants.sql.
--
-- This is the first migration that lets the order builder SAVE a draft order:
--  1. branding_options — a global catalog of gift add-ons (message card + box
--     branding), priced per gift. Read-only to any logged-in user, like products.
--  2. orders gains its mode, the two chosen branding options, and a shared message.
--  3. order_items — the chosen boxes (product + size + quantity) on an order.
--  4. recipients (already exists) gains a direct link to the order, an optional
--     per-recipient message override, and the self-claim choice.
--
-- Everything stays account-scoped via current_account_id() (a company only ever
-- sees its own orders / items / recipients). Additive and safe to re-run.
-- =============================================================================

-- =============================================================================
-- 1. branding_options — global gift add-on catalog
-- `group_key` (not `group`, which is a SQL reserved word) buckets options into
-- the message-card choice vs the box-branding choice. Prices are whole cents.
-- =============================================================================
create table if not exists public.branding_options (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  group_key   text not null check (group_key in ('message_card', 'box_branding')),
  price_cents integer not null check (price_cents >= 0),
  currency    text not null default 'CAD',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  -- Natural key so the seed can upsert idempotently.
  unique (group_key, name)
);

-- =============================================================================
-- 2. orders — add the builder's order-level choices
-- =============================================================================
alter table public.orders
  add column if not exists mode text check (mode in ('single', 'multiple'));

alter table public.orders
  add column if not exists message_card_option_id uuid
    references public.branding_options (id) on delete set null;

alter table public.orders
  add column if not exists box_branding_option_id uuid
    references public.branding_options (id) on delete set null;

alter table public.orders
  add column if not exists shared_message text;

-- =============================================================================
-- 3. order_items — the chosen boxes on an order (product + size + quantity)
-- A dedicated line-item table (NOT gift_group_products, which models products
-- offered to a gift group for self-claim choice — a different concept with no
-- variant/quantity). gift_groups / gift_group_products are left for future tiering.
-- =============================================================================
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  variant_id  uuid not null references public.product_variants (id) on delete restrict,
  quantity    integer not null check (quantity >= 1),
  created_at  timestamptz not null default now(),
  -- A given box + size appears once per order, carrying its quantity.
  unique (order_id, product_id, variant_id)
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);

-- =============================================================================
-- 4. recipients — link directly to the order, add message override + self-claim
-- The table already has nullable contact/address + claim fields (0001_init.sql).
-- The builder links recipients to the ORDER (not a gift_group), so gift_group_id
-- becomes nullable here.
-- =============================================================================
alter table public.recipients
  add column if not exists order_id uuid references public.orders (id) on delete cascade;

alter table public.recipients
  add column if not exists message text;

alter table public.recipients
  add column if not exists self_claim boolean not null default false;

alter table public.recipients
  alter column gift_group_id drop not null;

create index if not exists idx_recipients_order_id on public.recipients (order_id);

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

-- ---- branding_options: GLOBAL read-only catalog for any logged-in user ----
alter table public.branding_options enable row level security;

drop policy if exists branding_options_select_all on public.branding_options;
create policy branding_options_select_all on public.branding_options
  for select to authenticated
  using (true);

-- ---- order_items: full access scoped via the parent order's account ----
alter table public.order_items enable row level security;

drop policy if exists order_items_all_own on public.order_items;
create policy order_items_all_own on public.order_items
  for all to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.account_id = (select public.current_account_id())
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.account_id = (select public.current_account_id())
    )
  );

-- ---- recipients: REPLACE the old gift_group-based policy with an order-scoped
-- one. The builder attaches recipients to the order (gift_group_id is null), so
-- the previous gift_group -> order -> account policy would deny those rows. ----
drop policy if exists recipients_all_own on public.recipients;
create policy recipients_all_own on public.recipients
  for all to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = recipients.order_id
        and o.account_id = (select public.current_account_id())
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = recipients.order_id
        and o.account_id = (select public.current_account_id())
    )
  );
