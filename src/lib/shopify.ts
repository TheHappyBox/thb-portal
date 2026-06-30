import "server-only";

/**
 * Read-only Shopify Admin API client for the catalog sync. We ONLY ever read
 * from Shopify; all writes go to our own DB. Auth uses the client-credentials
 * grant (Dev Dashboard custom app); tokens last ~24h and we fetch a fresh one
 * per sync. Never logs the secret or the token.
 */

const API_VERSION = "2026-04";

function storeDomain(): string {
  const raw = (process.env.SHOPIFY_STORE_DOMAIN ?? "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!raw) throw new Error("SHOPIFY_STORE_DOMAIN is not set.");
  return raw;
}

/** Exchange client id + secret for a short-lived Admin API access token. */
export async function getAdminToken(): Promise<string> {
  const domain = storeDomain();
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET are not set.");
  }

  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const text = await res.text();
  let json: { access_token?: string; error?: string; error_description?: string } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok || !json?.access_token) {
    const detail = json?.error_description || json?.error || text.slice(0, 200);
    if (json?.error === "app_not_installed") {
      throw new Error("Shopify token exchange failed: app not installed on this store (check SHOPIFY_STORE_DOMAIN is the exact .myshopify.com handle).");
    }
    throw new Error(`Shopify token exchange failed (HTTP ${res.status}): ${detail}`);
  }

  return json.access_token;
}

/** Run a GraphQL Admin API query. Throws on transport or GraphQL errors. */
export async function shopifyGraphQL<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const domain = storeDomain();
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let json: { data?: T; errors?: { message: string; extensions?: { code?: string } }[] } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Shopify GraphQL forbidden (403) — the app is likely missing the read_products scope. Add it in the Dev Dashboard and reinstall.");
    }
    throw new Error(`Shopify GraphQL request failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (json?.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json?.data) {
    throw new Error("Shopify GraphQL returned no data.");
  }
  return json.data;
}

// --- Mapping types -----------------------------------------------------------

export interface SyncVariant {
  shopify_variant_id: string;
  name: string;
  price_cents: number;
  available: boolean;
  sort_order: number;
  is_default: boolean;
}

export interface SyncProduct {
  handle: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sku: string;
  price_cents: number;
  variants: SyncVariant[];
}

interface RawVariant {
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
}
interface RawProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  description: string | null;
  featuredImage: { url: string } | null;
  variants: { nodes: RawVariant[] };
}

const PRODUCTS_QUERY = `
  query ActiveProducts($cursor: String) {
    products(first: 250, after: $cursor, query: "status:active") {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        handle
        status
        description
        featuredImage { url }
        variants(first: 100) {
          nodes {
            id
            title
            price
            availableForSale
            selectedOptions { name value }
          }
        }
      }
    }
  }`;

/** Numeric tail of a Shopify GID, e.g. gid://shopify/Product/123 -> "123". */
function gidNumericId(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1] || gid;
}

function priceToCents(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

/** A single-variant Shopify product has the placeholder option Title=Default Title. */
function variantName(v: RawVariant): string {
  const isDefaultOnly =
    v.selectedOptions.length === 1 &&
    v.selectedOptions[0].name === "Title" &&
    v.selectedOptions[0].value === "Default Title";
  return isDefaultOnly ? "Standard" : v.title;
}

function mapProduct(p: RawProduct): SyncProduct {
  const variants: SyncVariant[] = p.variants.nodes.map((v, i) => ({
    shopify_variant_id: gidNumericId(v.id),
    name: variantName(v),
    price_cents: priceToCents(v.price),
    available: v.availableForSale,
    sort_order: i,
    is_default: i === 0,
  }));

  const priceCents = variants.length > 0 ? Math.min(...variants.map((v) => v.price_cents)) : 0;

  return {
    handle: p.handle,
    title: p.title,
    description: p.description?.trim() ? p.description.trim() : null,
    image_url: p.featuredImage?.url ?? null,
    sku: `shopify-${gidNumericId(p.id)}`,
    price_cents: priceCents,
    variants,
  };
}

/** Fetch ALL active products (paginated), mapped to our sync payload shape. */
export async function fetchActiveProducts(token: string): Promise<SyncProduct[]> {
  const all: SyncProduct[] = [];
  let cursor: string | null = null;

  // Bounded loop (safety) — 40 pages * 250 = 10k products, far beyond our catalog.
  for (let page = 0; page < 40; page++) {
    const data: {
      products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RawProduct[] };
    } = await shopifyGraphQL(token, PRODUCTS_QUERY, { cursor });

    for (const node of data.products.nodes) {
      // Skip products with no usable variants rather than insert a broken row.
      const mapped = mapProduct(node);
      if (mapped.variants.length === 0) continue;
      all.push(mapped);
    }

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  return all;
}

/**
 * Safety gate (pure, testable): decide whether to ABORT the reconcile because the
 * fetch looks like a glitch — never wipe the catalog on a bad fetch.
 */
export function shouldAbortReconcile(
  fetchedCount: number,
  existingActiveCount: number,
): { abort: boolean; reason?: string } {
  if (fetchedCount === 0) {
    return { abort: true, reason: "Shopify returned 0 active products — aborting to avoid hiding the whole catalog." };
  }
  if (existingActiveCount > 5 && fetchedCount < Math.floor(existingActiveCount / 2)) {
    return {
      abort: true,
      reason: `Shopify returned only ${fetchedCount} active products vs ${existingActiveCount} currently active — an implausible drop, aborting.`,
    };
  }
  return { abort: false };
}
