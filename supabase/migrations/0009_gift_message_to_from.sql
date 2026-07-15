-- THB Corporate Gifting Portal — gift-message To / From.
--
-- The order already carries a single shared gift MESSAGE (orders.shared_message,
-- added in 0003). The gift-options step now also captures who the gift is TO and
-- FROM, so the printed card reads naturally ("To … From …"). Both are optional,
-- order-level, and free text — additive nullable columns, no backfill needed.

alter table public.orders
  add column if not exists gift_to text;

alter table public.orders
  add column if not exists gift_from text;
