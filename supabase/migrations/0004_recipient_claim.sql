-- =============================================================================
-- THB Corporate Gifting Portal — recipient self-claim access.
-- Apply via Supabase Dashboard -> SQL Editor -> Run, AFTER 0001..0003.
--
-- This powers the PUBLIC (no-login) recipient claim page at /claim/<token>.
--
-- SECURITY MODEL — read carefully:
--  * The `recipients` table's RLS is UNCHANGED: only an authenticated,
--    account-scoped policy exists, so the anon role has NO policy and CANNOT
--    read or write `recipients` directly (RLS denies by default).
--  * The ONLY public door is the two SECURITY DEFINER functions below. They run
--    with the function owner's privileges (bypassing RLS) but the database
--    guarantees their narrow shape: each matches a SINGLE recipient by its secret
--    `claim_token` AND `self_claim = true`, and returns ONLY whitelisted columns
--    (the recipient's own name/address/status + the company name + ONE derived
--    gift name). They never expose other recipients, the order's item list,
--    totals, emails, or any account internals.
--  * `set search_path = ''` + fully-qualified names harden against search-path
--    attacks (same pattern as current_account_id() / handle_new_user in 0001).
--  * EXECUTE is granted to anon + authenticated only.
--
-- The claim token itself is unchanged: recipients.claim_token is already a unique,
-- indexed, auto-generated UUID (0001_init.sql). claim_status already allows
-- 'invited' / 'claimed' / 'fulfilled'. This migration adds only the functions.
-- Re-runnable (create or replace).
-- =============================================================================

-- =============================================================================
-- claim_get_recipient — read one recipient's claimable info by token.
-- Returns 0 rows for an unknown / non-self_claim token (caller shows a friendly
-- "invalid link" page). gift_name is derived so the full order contents never leak.
-- =============================================================================
create or replace function public.claim_get_recipient(p_token uuid)
returns table (
  full_name     text,
  claim_status  text,
  address_line1 text,
  address_line2 text,
  city          text,
  region        text,
  postal_code   text,
  country       text,
  company_name  text,
  gift_name     text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.full_name,
    r.claim_status,
    r.address_line1,
    r.address_line2,
    r.city,
    r.region,
    r.postal_code,
    r.country,
    a.name as company_name,
    coalesce(
      (
        select case when count(distinct p.name) = 1 then min(p.name) end
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        where oi.order_id = r.order_id
      ),
      'a curated gift box'
    ) as gift_name
  from public.recipients r
  join public.orders o on o.id = r.order_id
  join public.accounts a on a.id = o.account_id
  where r.claim_token = p_token
    and r.self_claim = true;
$$;

-- =============================================================================
-- claim_submit_recipient — save one recipient's address by token and mark claimed.
-- Returns true on success; false if the token is unknown / not self_claim, or the
-- gift is already fulfilled (edit is only allowed until fulfillment). Updates ONLY
-- the matched recipient's name + address + claim_status; no other row or column.
-- =============================================================================
create or replace function public.claim_submit_recipient(
  p_token         uuid,
  p_full_name     text,
  p_address_line1 text,
  p_address_line2 text,
  p_city          text,
  p_region        text,
  p_postal_code   text,
  p_country       text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select claim_status
    into v_status
    from public.recipients
    where claim_token = p_token
      and self_claim = true;

  if v_status is null then
    return false;            -- unknown token or not a self-claim recipient
  end if;
  if v_status = 'fulfilled' then
    return false;            -- locked once fulfilled
  end if;

  update public.recipients
    set full_name     = nullif(btrim(p_full_name), ''),
        address_line1 = nullif(btrim(p_address_line1), ''),
        address_line2 = nullif(btrim(p_address_line2), ''),
        city          = nullif(btrim(p_city), ''),
        region        = nullif(btrim(p_region), ''),
        postal_code   = nullif(btrim(p_postal_code), ''),
        country       = nullif(btrim(p_country), ''),
        claim_status  = 'claimed'
    where claim_token = p_token
      and self_claim = true;

  return true;
end;
$$;

-- =============================================================================
-- GRANTS — the functions are the only public door; lock them to anon + auth.
-- =============================================================================
revoke all on function public.claim_get_recipient(uuid) from public;
revoke all on function public.claim_submit_recipient(uuid, text, text, text, text, text, text, text) from public;

grant execute on function public.claim_get_recipient(uuid) to anon, authenticated;
grant execute on function public.claim_submit_recipient(uuid, text, text, text, text, text, text, text) to anon, authenticated;
