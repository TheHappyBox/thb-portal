-- =============================================================================
-- THB Corporate Gifting Portal — brand asset (logo) uploads & management.
-- Apply via `npm run db:push`, AFTER 0001..0006. Additive and safe to re-run.
--
-- The FIRST file-upload feature. A company uploads brand logos, stored in a
-- PRIVATE Supabase Storage bucket and tracked by the brand_assets table. Files
-- are NEVER public: the only access is authenticated + account-scoped.
--
-- SECURITY MODEL — isolation is structural AND enforced by RLS:
--  * Bucket `brand-assets` is private (public = false).
--  * Every object is stored under `<account_id>/<uuid>.<ext>`, so the object's
--    own path encodes its owner.
--  * Storage RLS (policies on storage.objects below) compares the object's FIRST
--    path segment to the caller's account, derived server-side via the existing
--    current_account_id() SECURITY DEFINER helper (which the client cannot forge).
--    A user can therefore only read / sign / upload / delete objects under their
--    OWN `<account_id>/` folder — no cross-account access, by path or otherwise.
-- =============================================================================

-- =============================================================================
-- 1. brand_assets — one row per uploaded file, tied to an account
-- =============================================================================
create table if not exists public.brand_assets (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.accounts (id) on delete cascade,
  -- The object name within the bucket, e.g. "<account_id>/<uuid>.png".
  storage_path text not null,
  file_name    text not null,            -- original upload filename
  label        text,                     -- optional, e.g. "Primary", "White version"
  content_type text not null,
  size_bytes   integer not null check (size_bytes >= 0),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (account_id, storage_path)
);

create index if not exists idx_brand_assets_account_id on public.brand_assets (account_id);

-- ---- RLS: a company sees/manages ONLY its own rows (mirrors orders policies) ----
alter table public.brand_assets enable row level security;

drop policy if exists brand_assets_all_own on public.brand_assets;
create policy brand_assets_all_own on public.brand_assets
  for all to authenticated
  using (account_id = (select public.current_account_id()))
  with check (account_id = (select public.current_account_id()));

-- =============================================================================
-- 2. Storage bucket — private, 10 MB per file
-- file_size_limit is bytes (10 * 1024 * 1024). MIME validation is enforced in the
-- upload action (EPS often arrives as application/octet-stream, so the bucket's
-- mime allow-list is left open to avoid false rejections).
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('brand-assets', 'brand-assets', false, 10485760)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- =============================================================================
-- 3. Storage RLS — only the owning account may touch its `<account_id>/` folder.
-- (storage.foldername(name))[1] is the first path segment, i.e. the account id.
-- =============================================================================
drop policy if exists brand_assets_objects_select on storage.objects;
create policy brand_assets_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select public.current_account_id())::text
  );

drop policy if exists brand_assets_objects_insert on storage.objects;
create policy brand_assets_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select public.current_account_id())::text
  );

drop policy if exists brand_assets_objects_update on storage.objects;
create policy brand_assets_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select public.current_account_id())::text
  )
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select public.current_account_id())::text
  );

drop policy if exists brand_assets_objects_delete on storage.objects;
create policy brand_assets_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select public.current_account_id())::text
  );
