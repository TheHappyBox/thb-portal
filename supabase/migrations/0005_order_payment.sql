-- =============================================================================
-- THB Corporate Gifting Portal — order checkout & payment (Stripe, TEST mode).
-- Apply via `npm run db:push`, AFTER 0001..0004. Additive and safe to re-run.
--
-- Adds the payment lifecycle to orders:
--  1. A new `paid` status (draft -> paid). Existing statuses are preserved.
--  2. Columns tying an order to its Stripe payment + a charged-amount snapshot.
--  3. mark_order_paid() — the SINGLE, idempotent server-side door that flips an
--     order to paid. Called by the Stripe webhook via the SECRET-key admin client
--     (the webhook has no logged-in user). Mirrors the self-claim pattern in 0004:
--     a narrow SECURITY DEFINER function instead of loosening any client RLS.
--
-- SECURITY NOTE — client RLS is UNCHANGED. Companies still only ever see/touch
-- their own orders via the existing account-scoped policies (0001/0003). The
-- webhook does not use a client session at all; it uses the secret key, and the
-- "paid" transition logic lives here in the database, guarded and idempotent.
-- =============================================================================

-- =============================================================================
-- 1. orders.status — allow the new 'paid' state
-- The original CHECK was defined inline (unnamed), so Postgres named it
-- `orders_status_check`. Drop and recreate it with 'paid' added.
-- =============================================================================
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('draft','submitted','processing','completed','cancelled','paid'));

-- =============================================================================
-- 2. orders — Stripe payment linkage + charged-amount snapshot
--  * stripe_checkout_session_id — the hosted Checkout Session (set at checkout).
--    Unique so a single session can only ever mark one order, and re-processing
--    the same event is a no-op.
--  * stripe_payment_intent_id  — the resulting PaymentIntent (set by the webhook).
--  * amount_total_cents        — snapshot of the charged total (whole cents, CAD)
--    captured at checkout time, so the paid amount is recorded even if catalog
--    prices change later.
--  * paid_at                   — when payment was confirmed.
-- =============================================================================
alter table public.orders
  add column if not exists stripe_checkout_session_id text;

alter table public.orders
  add column if not exists stripe_payment_intent_id text;

alter table public.orders
  add column if not exists amount_total_cents integer
    check (amount_total_cents is null or amount_total_cents >= 0);

alter table public.orders
  add column if not exists paid_at timestamptz;

create unique index if not exists idx_orders_stripe_checkout_session_id
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- =============================================================================
-- 3. mark_order_paid — idempotent server-side "mark this order paid".
-- Returns true only when THIS call flipped the order (a real first-time payment);
-- false if the order is missing or was already paid (a duplicate/replayed webhook
-- event). The `status <> 'paid'` guard is what makes repeated events safe.
--
-- coalesce() preserves the checkout-time amount snapshot if one was already set,
-- falling back to the amount Stripe reports on the event.
-- =============================================================================
create or replace function public.mark_order_paid(
  p_order_id            uuid,
  p_checkout_session_id text,
  p_payment_intent_id   text,
  p_amount_total_cents  integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.orders
     set status                     = 'paid',
         paid_at                    = now(),
         stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_checkout_session_id),
         stripe_payment_intent_id   = p_payment_intent_id,
         amount_total_cents         = coalesce(amount_total_cents, p_amount_total_cents)
   where id = p_order_id
     and status <> 'paid';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- The webhook authenticates with the SECRET key (service_role). Lock execution to
-- that role only — no anon / authenticated client can call this.
revoke all on function public.mark_order_paid(uuid, text, text, integer) from public;
grant execute on function public.mark_order_paid(uuid, text, text, integer) to service_role;
