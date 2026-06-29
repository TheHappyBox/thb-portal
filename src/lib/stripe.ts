import "server-only";

import Stripe from "stripe";

/**
 * Server-only Stripe client (uses the SECRET key, so it must never reach the
 * browser — the `server-only` import makes that a build error).
 *
 * We create it LAZILY via getStripe() rather than at module load: that way the
 * app still builds and lints before the founder has pasted the Stripe TEST keys
 * into .env.local. The first call without a key fails loudly with a clear message
 * instead of silently mischarging anyone.
 *
 * TEST MODE: with a `sk_test_...` key, every charge is fake — no real money moves.
 * The API version is intentionally left unset so we track the version pinned to
 * the installed SDK.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — add your Stripe TEST secret key (sk_test_...) to .env.local.",
    );
  }

  client = new Stripe(key);
  return client;
}
