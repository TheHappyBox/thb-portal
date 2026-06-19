-- =============================================================================
-- THB Corporate Gifting Portal — initial schema, multi-tenant RLS, and auth
-- provisioning. Apply via Supabase Dashboard -> SQL Editor -> Run.
--
-- Multi-tenancy model: every company is an `account`. Every `user` belongs to
-- exactly one account and is linked to Supabase Auth. Row Level Security (RLS)
-- ensures a logged-in user can only ever read/act on rows for THEIR OWN account.
--
-- Catalog tables (`categories`, `products`) are GLOBAL — they are The Happy Box's
-- shared catalog that every corporate client browses, so they are read-only to
-- all logged-in users (not account-scoped).
-- =============================================================================

-- This migration is written to be safe to re-run during development.
create extension if not exists "pgcrypto"; -- provides gen_random_uuid()

-- =============================================================================
-- TABLES
-- =============================================================================

-- A company / tenant.
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- A person who logs in. Linked 1:1 to a Supabase Auth user, belongs to one account.
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  account_id  uuid not null references public.accounts (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'member' check (role in ('admin', 'member')),
  created_at  timestamptz not null default now()
);

-- Themed collections (global catalog).
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  description text,
  created_at  timestamptz not null default now()
);

-- The gift boxes (global catalog).
-- Prices are stored as whole cents to keep money math exact (4999 = CA$49.99).
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name        text not null,
  sku         text not null unique,
  price_cents integer not null check (price_cents >= 0),
  currency    text not null default 'CAD',
  description text,
  image_url   text,
  is_active   boolean not null default true,
  is_featured boolean not null default false,
  created_at  timestamptz not null default now()
);

-- An order belongs to an account and is created by a user.
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts (id) on delete cascade,
  created_by      uuid references public.users (id) on delete set null,
  status          text not null default 'draft'
                    check (status in ('draft','submitted','processing','completed','cancelled')),
  delivery_method text not null default 'self_claim'
                    check (delivery_method in ('self_claim','bulk_ship')),
  created_at      timestamptz not null default now()
);

-- A tier within an order: a label, a per-recipient budget, and (via the join
-- table below) the set of products offered to recipients in this group.
create table if not exists public.gift_groups (
  id                         uuid primary key default gen_random_uuid(),
  order_id                   uuid not null references public.orders (id) on delete cascade,
  name                       text not null,
  budget_per_recipient_cents integer check (budget_per_recipient_cents >= 0),
  created_at                 timestamptz not null default now()
);

-- The set of products offered to a gift group (many-to-many).
create table if not exists public.gift_group_products (
  gift_group_id uuid not null references public.gift_groups (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  primary key (gift_group_id, product_id)
);

-- A recipient belongs to a gift group. Supports a "self-claim" flow: a recipient
-- can exist BEFORE they've given contact/address details, so those are nullable.
-- `claim_token` powers a shareable claim link. The shopify_* / fulfillment_status
-- fields are a clean seam for a FUTURE Shopify handoff (not used yet).
create table if not exists public.recipients (
  id                 uuid primary key default gen_random_uuid(),
  gift_group_id      uuid not null references public.gift_groups (id) on delete cascade,

  -- Contact + address: all nullable until the recipient self-claims.
  full_name          text,
  email              text,
  phone              text,
  address_line1      text,
  address_line2      text,
  city               text,
  region             text,
  postal_code        text,
  country            text,

  claim_status       text not null default 'invited'
                       check (claim_status in ('invited','claimed','fulfilled')),
  claim_token        uuid not null unique default gen_random_uuid(),
  selected_product_id uuid references public.products (id) on delete set null,

  -- Future Shopify handoff seam (intentionally unused for now):
  shopify_order_id   text,
  fulfillment_status text,

  created_at         timestamptz not null default now()
);

-- =============================================================================
-- INDEXES (on foreign keys + the claim-link lookup)
-- =============================================================================
create index if not exists idx_users_account_id            on public.users (account_id);
create index if not exists idx_products_category_id         on public.products (category_id);
create index if not exists idx_orders_account_id            on public.orders (account_id);
create index if not exists idx_orders_created_by            on public.orders (created_by);
create index if not exists idx_gift_groups_order_id         on public.gift_groups (order_id);
create index if not exists idx_ggp_product_id               on public.gift_group_products (product_id);
create index if not exists idx_recipients_gift_group_id     on public.recipients (gift_group_id);
create index if not exists idx_recipients_claim_token       on public.recipients (claim_token);
create index if not exists idx_recipients_selected_product  on public.recipients (selected_product_id);

-- =============================================================================
-- AUTH PROVISIONING
-- When a new Supabase Auth user is created, atomically create their company
-- (account) and their profile row as the company ADMIN. Runs as SECURITY DEFINER
-- so it can write rows regardless of RLS. The company name + full name are read
-- from the signup metadata passed by the app.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_account_id uuid;
begin
  insert into public.accounts (name)
    values (coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), 'My Company'))
    returning id into new_account_id;

  insert into public.users (id, account_id, email, full_name, role)
    values (
      new.id,
      new_account_id,
      new.email,
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      'admin'
    );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- RLS HELPER
-- Returns the account_id of the currently logged-in user. SECURITY DEFINER so
-- that reading public.users here does NOT trigger the users-table RLS policy
-- (which would otherwise recurse). Used by all account-scoped policies.
-- =============================================================================
create or replace function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select account_id from public.users where id = (select auth.uid())
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- Enabled on EVERY table. By default, enabling RLS denies all access; access is
-- then granted only by the policies below.
-- =============================================================================
alter table public.accounts            enable row level security;
alter table public.users               enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.orders              enable row level security;
alter table public.gift_groups         enable row level security;
alter table public.gift_group_products enable row level security;
alter table public.recipients          enable row level security;

-- ---- accounts: a user sees only their own company ----
drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own on public.accounts
  for select to authenticated
  using (id = (select public.current_account_id()));

drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own on public.accounts
  for update to authenticated
  using (id = (select public.current_account_id()))
  with check (id = (select public.current_account_id()));

-- ---- users: a user sees only colleagues in their own account (incl. self) ----
drop policy if exists users_select_same_account on public.users;
create policy users_select_same_account on public.users
  for select to authenticated
  using (account_id = (select public.current_account_id()));

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---- categories / products: GLOBAL read-only catalog for any logged-in user ----
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select to authenticated
  using (true);

drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select to authenticated
  using (true);

-- ---- orders: full access scoped to the user's own account ----
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated
  using (account_id = (select public.current_account_id()));

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert to authenticated
  with check (account_id = (select public.current_account_id()));

drop policy if exists orders_update_own on public.orders;
create policy orders_update_own on public.orders
  for update to authenticated
  using (account_id = (select public.current_account_id()))
  with check (account_id = (select public.current_account_id()));

drop policy if exists orders_delete_own on public.orders;
create policy orders_delete_own on public.orders
  for delete to authenticated
  using (account_id = (select public.current_account_id()));

-- ---- gift_groups: scoped via the parent order's account ----
drop policy if exists gift_groups_all_own on public.gift_groups;
create policy gift_groups_all_own on public.gift_groups
  for all to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = gift_groups.order_id
        and o.account_id = (select public.current_account_id())
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = gift_groups.order_id
        and o.account_id = (select public.current_account_id())
    )
  );

-- ---- gift_group_products: scoped via gift_group -> order -> account ----
drop policy if exists ggp_all_own on public.gift_group_products;
create policy ggp_all_own on public.gift_group_products
  for all to authenticated
  using (
    exists (
      select 1
      from public.gift_groups g
      join public.orders o on o.id = g.order_id
      where g.id = gift_group_products.gift_group_id
        and o.account_id = (select public.current_account_id())
    )
  )
  with check (
    exists (
      select 1
      from public.gift_groups g
      join public.orders o on o.id = g.order_id
      where g.id = gift_group_products.gift_group_id
        and o.account_id = (select public.current_account_id())
    )
  );

-- ---- recipients: scoped via gift_group -> order -> account ----
-- NOTE: the public, unauthenticated "self-claim by token" path is deliberately
-- NOT opened here; it is a future seam. These policies cover account members only.
drop policy if exists recipients_all_own on public.recipients;
create policy recipients_all_own on public.recipients
  for all to authenticated
  using (
    exists (
      select 1
      from public.gift_groups g
      join public.orders o on o.id = g.order_id
      where g.id = recipients.gift_group_id
        and o.account_id = (select public.current_account_id())
    )
  )
  with check (
    exists (
      select 1
      from public.gift_groups g
      join public.orders o on o.id = g.order_id
      where g.id = recipients.gift_group_id
        and o.account_id = (select public.current_account_id())
    )
  );
