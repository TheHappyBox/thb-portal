-- =============================================================================
-- THB Corporate Gifting Portal — branding options seed (gift add-ons).
-- Apply via Supabase Dashboard -> SQL Editor -> Run, AFTER:
--   1) 0001_init.sql
--   2) 0002_product_variants.sql
--   3) 0003_order_persistence.sql  (creates branding_options)
--
-- IDEMPOTENT / REPEATABLE: upserts on (group_key, name). Prices are whole cents
-- in CAD and are charged PER GIFT (per unit), on top of the box price.
-- =============================================================================

insert into public.branding_options (name, group_key, price_cents, sort_order, is_active) values
  -- Message card
  ('No message card',      'message_card',    0, 0, true),
  ('Branded message card', 'message_card',  300, 1, true),
  -- Box branding
  ('None',                 'box_branding',    0, 0, true),
  ('Sticker',              'box_branding',  299, 1, true),
  ('Belly band',           'box_branding',  399, 2, true),
  ('Branded sleeve',       'box_branding',  700, 3, true)
on conflict (group_key, name) do update set
  price_cents = excluded.price_cents,
  sort_order  = excluded.sort_order,
  is_active   = excluded.is_active;

-- =============================================================================
-- VERIFICATION (expected results in comments)
-- =============================================================================
-- Expect 6 rows total (2 message_card + 4 box_branding):
--   select group_key, count(*) from public.branding_options group by group_key;
--
-- Expect prices: No card 0 / Branded card 300; None 0 / Sticker 299 /
-- Belly band 399 / Branded sleeve 700:
--   select group_key, name, price_cents
--   from public.branding_options
--   order by group_key, sort_order;
