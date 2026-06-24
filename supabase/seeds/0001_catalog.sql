-- =============================================================================
-- THB Corporate Gifting Portal — catalog seed (categories + products + sizes).
-- Apply via Supabase Dashboard -> SQL Editor -> Run, AFTER:
--   1) 0001_init.sql            (base schema)
--   2) 0002_product_variants.sql (source/shopify_handle + product_variants)
--
-- This file is IDEMPOTENT / REPEATABLE: run it as many times as you like. It
-- upserts on natural keys (categories.slug, products.sku, variant name per
-- product), so re-running updates rows in place rather than creating duplicates.
--
-- These are The Happy Box's real gift boxes, seeded as source = 'shopify' with
-- their Shopify handle, so the future live Shopify sync can reconcile them.
-- Prices are whole cents in CAD (9900 = CA$99.00). Two-size boxes offer
-- "Happy" (9900, default) and "Extra Happy" (16900); fixed boxes have one size.
-- =============================================================================

-- =============================================================================
-- 1. CATEGORIES
-- =============================================================================
insert into public.categories (name, slug) values
  ('Self-Care & Wellness',     'self-care-wellness'),
  ('Celebrations & Occasions', 'celebrations-occasions'),
  ('Food & Treats',            'food-treats'),
  ('Activities & Hobbies',     'activities-hobbies'),
  ('Home & Lifestyle',         'home-lifestyle'),
  ('Appreciation & Thanks',    'appreciation-thanks'),
  ('Canadiana',                'canadiana')
on conflict (slug) do update set
  name = excluded.name;

-- =============================================================================
-- 2. PRODUCTS
-- products.price_cents holds the DEFAULT size's price (the "from" price for
-- two-size boxes; the flat price for fixed boxes). The product_variants rows
-- below are the source of truth for what the catalog displays.
-- =============================================================================
insert into public.products
  (name, sku, category_id, price_cents, currency, description, source, shopify_handle, is_active, is_featured)
select
  v.name, v.sku, c.id, v.price_cents, 'CAD', v.description, 'shopify', v.shopify_handle, true, v.is_featured
from (values
  ('Comfort & Essentials',     'THB-COMFORT',   'self-care-wellness',      9900, 'Cozy must-haves to help someone slow down and feel cared for.',   'self-care-gift-box-canada',          true),
  ('Rest & Recharge',          'THB-REST',      'self-care-wellness',      7900, 'Calming picks for winding down to truly restful sleep.',          'rest-recharge',                      false),
  ('Mindful Moments',          'THB-MINDFUL',   'self-care-wellness',      6900, 'Small rituals for pause, breath, and a clearer head.',            'mindful-moments',                    false),
  ('Birthday Box',             'THB-BIRTHDAY',  'celebrations-occasions',  9900, 'A festive bundle that makes their day feel genuinely celebrated.','birthday-gift-box-canada',           true),
  ('Celebrate and Cheer',      'THB-CHEER',     'celebrations-occasions',  9900, 'Bubbly, cheerful treats for toasting any happy milestone.',       'celebrate-and-cheer',                false),
  ('The Coffee Box',           'THB-COFFEE',    'food-treats',             9900, 'Everything a coffee lover needs for the perfect slow morning.',   'coffee-gift-box-canada-coffee-box',  true),
  ('Dinner for Two',           'THB-DINNER',    'food-treats',            12900, 'A cozy at-home date night, plated and ready to share.',           'dinner-for-two',                     false),
  ('The Treats Box',           'THB-TREATS',    'food-treats',             9900, 'A generous spread of sweet and savoury crowd-pleasers.',          'tis-the-season-of-treats-1',         false),
  ('Wholesome Treats',         'THB-WHOLESOME', 'food-treats',             6900, 'Better-for-you snacks that still taste like a treat.',            'wholesome-treats',                   false),
  ('Bored at Home',            'THB-BORED',     'activities-hobbies',      9900, 'Games and activities to turn a quiet day into a fun one.',        'activity-gift-box-canada',           false),
  ('The Sustainable Home Box', 'THB-SUSTAIN',   'home-lifestyle',          9900, 'Eco-friendly home goods for greener everyday living.',            'sustainable-home-box',               false),
  ('Cottage Box',              'THB-COTTAGE',   'home-lifestyle',          9900, 'Lake-day essentials for slow weekends at the cottage.',           'cottage-box',                        false),
  ('Thank You Box',            'THB-THANKYOU',  'appreciation-thanks',     6900, 'A heartfelt way to say thanks and mean it.',                      'thank-you-box',                      false),
  ('The Canadiana Box',        'THB-CANADIANA', 'canadiana',              12900, 'A proudly Canadian sampler of homegrown favourites.',             'canadian-gift-box-the-canadiana-box',true)
) as v(name, sku, category_slug, price_cents, description, shopify_handle, is_featured)
join public.categories c on c.slug = v.category_slug
on conflict (sku) do update set
  name           = excluded.name,
  category_id    = excluded.category_id,
  price_cents    = excluded.price_cents,
  currency       = excluded.currency,
  description    = excluded.description,
  source         = excluded.source,
  shopify_handle = excluded.shopify_handle,
  is_active      = excluded.is_active,
  is_featured    = excluded.is_featured;

-- =============================================================================
-- 3. PRODUCT VARIANTS (the box sizes)
-- Two-size boxes -> 'Happy' (9900, default) + 'Extra Happy' (16900).
-- Fixed boxes    -> one 'Standard' size at the box's price.
-- =============================================================================
insert into public.product_variants
  (product_id, name, price_cents, currency, sort_order, is_default)
select
  p.id, v.variant_name, v.price_cents, 'CAD', v.sort_order, v.is_default
from (values
  -- Two-size boxes: Happy (default) + Extra Happy
  ('THB-COMFORT',   'Happy',        9900, 0, true),
  ('THB-COMFORT',   'Extra Happy', 16900, 1, false),
  ('THB-BIRTHDAY',  'Happy',        9900, 0, true),
  ('THB-BIRTHDAY',  'Extra Happy', 16900, 1, false),
  ('THB-CHEER',     'Happy',        9900, 0, true),
  ('THB-CHEER',     'Extra Happy', 16900, 1, false),
  ('THB-COFFEE',    'Happy',        9900, 0, true),
  ('THB-COFFEE',    'Extra Happy', 16900, 1, false),
  ('THB-TREATS',    'Happy',        9900, 0, true),
  ('THB-TREATS',    'Extra Happy', 16900, 1, false),
  ('THB-BORED',     'Happy',        9900, 0, true),
  ('THB-BORED',     'Extra Happy', 16900, 1, false),
  ('THB-SUSTAIN',   'Happy',        9900, 0, true),
  ('THB-SUSTAIN',   'Extra Happy', 16900, 1, false),
  ('THB-COTTAGE',   'Happy',        9900, 0, true),
  ('THB-COTTAGE',   'Extra Happy', 16900, 1, false),
  -- Fixed boxes: one size
  ('THB-REST',      'Standard',     7900, 0, true),
  ('THB-MINDFUL',   'Standard',     6900, 0, true),
  ('THB-DINNER',    'Standard',    12900, 0, true),
  ('THB-WHOLESOME', 'Standard',     6900, 0, true),
  ('THB-THANKYOU',  'Standard',     6900, 0, true),
  ('THB-CANADIANA', 'Standard',    12900, 0, true)
) as v(sku, variant_name, price_cents, sort_order, is_default)
join public.products p on p.sku = v.sku
on conflict (product_id, name) do update set
  price_cents = excluded.price_cents,
  currency    = excluded.currency,
  sort_order  = excluded.sort_order,
  is_default  = excluded.is_default;

-- =============================================================================
-- VERIFICATION (run these after seeding; expected results in comments)
-- =============================================================================
-- Expect 7 categories:
--   select count(*) from public.categories;
--
-- Expect 14 products:
--   select count(*) from public.products;
--
-- Per-product variant summary. Expect:
--   * 8 two-size boxes  -> variants = 2, min 9900 / max 16900, defaults = 1
--   * 6 fixed boxes     -> variants = 1, min = max = flat price, defaults = 1
--   select p.sku,
--          count(v.*)                          as variants,
--          min(v.price_cents)                  as min_cents,
--          max(v.price_cents)                  as max_cents,
--          count(*) filter (where v.is_default) as defaults
--   from public.products p
--   join public.product_variants v on v.product_id = p.id
--   group by p.sku
--   order by p.sku;
