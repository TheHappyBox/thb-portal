-- =============================================================================
-- THB Corporate Gifting Portal — buyer company address on accounts.
-- Apply via `npm run db:push`, AFTER 0001..0005. Additive and safe to re-run.
--
-- The account settings page lets a buyer company edit its own details. The
-- company NAME already exists (accounts.name); this adds its mailing ADDRESS.
-- These describe the BUYER's company — not The Happy Box's own address.
--
-- No RLS change: the existing account-scoped policies already cover these new
-- columns. `accounts_update_own` (0001) allows a member to update only their own
-- account (id = current_account_id()), and `users_update_self` covers profile
-- name edits. Both are column-agnostic, so they apply to these fields too.
-- =============================================================================

alter table public.accounts
  add column if not exists address_line1 text;

alter table public.accounts
  add column if not exists address_line2 text;

alter table public.accounts
  add column if not exists city text;

alter table public.accounts
  add column if not exists region text;

alter table public.accounts
  add column if not exists postal_code text;

alter table public.accounts
  add column if not exists country text;
