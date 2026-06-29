import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook — the RELIABLE confirmation that an order was paid.
 *
 * Why a webhook (not just the browser returning to the success page): the buyer
 * might close the tab right after paying. Stripe still calls this endpoint, so
 * "paid" is driven from here, server-to-server, not from the redirect.
 *
 * Security: every request's signature is verified against STRIPE_WEBHOOK_SECRET;
 * unsigned or tampered requests are rejected with 400 and never touch the DB.
 *
 * Idempotency: Stripe may deliver the same event more than once. We call the
 * mark_order_paid() DB function, which only flips an order that isn't already
 * paid — so a replayed event is a harmless no-op.
 *
 * The write uses the SECRET-key admin client (there is no logged-in user on a
 * webhook). No client-facing RLS is loosened.
 */

// Stripe's SDK + signature verification need Node crypto, not the edge runtime.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Misconfiguration, not the caller's fault — 500 so Stripe retries later.
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set." },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  // The raw request body is required for signature verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only act on a genuinely paid session.
    if (session.payment_status === "paid") {
      const orderId = session.metadata?.order_id ?? session.client_reference_id ?? null;
      if (!orderId) {
        // Nothing we can match — acknowledge so Stripe doesn't retry forever.
        return NextResponse.json(
          { received: true, warning: "No order_id on the session." },
          { status: 200 },
        );
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);

      const admin = createAdminClient();
      const { data: flipped, error } = await admin.rpc("mark_order_paid", {
        p_order_id: orderId,
        p_checkout_session_id: session.id,
        p_payment_intent_id: paymentIntentId,
        p_amount_total_cents: session.amount_total,
      });

      if (error) {
        // Let Stripe retry on a transient DB error.
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // flipped === false means it was already paid (a replayed event) — fine.
      return NextResponse.json({ received: true, marked_paid: flipped === true });
    }
  }

  // Acknowledge all other event types so Stripe considers them delivered.
  return NextResponse.json({ received: true });
}
