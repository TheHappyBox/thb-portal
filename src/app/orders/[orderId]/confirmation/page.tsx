import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { ProductImage } from "@/components/product-image";
import { ClaimLink } from "@/components/order-builder/claim-link";
import { formatPrice } from "@/lib/pricing";
import { brandingById, orderTotalCents, resolveBoxes } from "@/lib/order-builder";
import type { BrandingOption, ProductWithRelations } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Order confirmation · The Happy Box",
  description: "Your gift order is confirmed.",
};

/**
 * Confirmation page shown after returning from Stripe's hosted checkout. It is
 * GATED: the buyer must be logged in, and account-scoped RLS means they can only
 * ever load their own order (another company's id 404s).
 *
 * Important: this page READS the order's status — it never sets it. "Paid" is
 * driven solely by the Stripe webhook, so if the buyer beats the webhook back
 * here we show a brief "confirming…" state rather than a premature success.
 */
export default async function OrderConfirmationPage({
  params,
}: {
  // Next 16: dynamic route params are a Promise and must be awaited.
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS scopes this to the buyer's own account; another account's order → null.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, amount_total_cents, paid_at, mode, shared_message, message_card_option_id, box_branding_option_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    throw new Error(`Could not load your order: ${orderError.message}`);
  }
  if (!order) {
    notFound();
  }

  const isPaid = order.status === "paid";

  // Line items + catalog (global, RLS-readable) to rebuild the order summary.
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);

  const { data: productData } = await supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("is_active", true);
  const products = (productData ?? []) as ProductWithRelations[];

  const boxes = (items ?? []).map((i) => ({
    productId: i.product_id,
    variantId: i.variant_id,
    quantity: i.quantity,
  }));
  const views = resolveBoxes(boxes, products);

  const brandingIds = [order.message_card_option_id, order.box_branding_option_id].filter(
    (id): id is string => typeof id === "string",
  );
  let brandingOptions: BrandingOption[] = [];
  if (brandingIds.length > 0) {
    const { data: brandingData } = await supabase
      .from("branding_options")
      .select("*")
      .in("id", brandingIds);
    brandingOptions = (brandingData ?? []) as BrandingOption[];
  }
  const messageCard = brandingById(brandingOptions, order.message_card_option_id);
  const boxBranding = brandingById(brandingOptions, order.box_branding_option_id);

  const currency = views[0]?.variant.currency ?? "CAD";
  // Prefer the snapshot charged at checkout; fall back to a live recompute.
  const totalCents = order.amount_total_cents ?? orderTotalCents(views, messageCard, boxBranding);

  // Recipients (for the count + self-claim links).
  const { data: recipientsData } = await supabase
    .from("recipients")
    .select("full_name, self_claim, claim_token")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  const recipients = recipientsData ?? [];
  const selfClaimRecipients = recipients.filter((r) => r.self_claim && r.claim_token);

  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/catalog"
            className="text-sm text-brand-muted transition hover:text-brand-ink"
          >
            ← Catalog
          </Link>
          <SignOutButton />
        </header>

        {isPaid ? (
          <ConfirmedHeader paidTotal={formatPrice(totalCents, currency)} />
        ) : (
          <PendingHeader refreshHref={`/orders/${orderId}/confirmation`} />
        )}

        {/* Order summary */}
        <section className="flex flex-col gap-4 rounded-xl border border-brand-sand bg-white p-5">
          <h2 className="text-lg font-semibold text-brand-ink">Order summary</h2>

          {views.length > 0 && (
            <ul className="flex flex-col divide-y divide-brand-sand">
              {views.map((view) => (
                <li
                  key={`${view.productId}-${view.variantId}`}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-brand-sand">
                    <ProductImage src={view.product.image_url} alt={view.product.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-brand-ink">{view.product.name}</p>
                    <p className="text-sm text-brand-muted">
                      {view.variant.name} · {formatPrice(view.variant.price_cents, currency)} ×{" "}
                      {view.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <dl className="flex flex-col gap-1 text-sm">
            <SummaryRow term="Message card" value={brandingLabel(messageCard)} />
            <SummaryRow term="Box branding" value={brandingLabel(boxBranding)} />
            <SummaryRow
              term="Recipients"
              value={`${recipients.length} ${recipients.length === 1 ? "recipient" : "recipients"}`}
            />
          </dl>

          {order.shared_message?.trim() && (
            <p className="rounded-md bg-brand-cream px-3 py-2 text-sm italic text-brand-ink">
              “{order.shared_message.trim()}”
            </p>
          )}

          <div className="flex items-center justify-between border-t border-brand-sand pt-4">
            <span className="font-semibold text-brand-ink">
              {isPaid ? "Total paid" : "Order total"}
            </span>
            <span className="text-xl font-semibold text-brand-ink">
              {formatPrice(totalCents, currency)}
            </span>
          </div>
        </section>

        {/* Self-claim links (emailing them is a later step). */}
        {selfClaimRecipients.length > 0 && (
          <section className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-brand-ink">Self-claim links</h2>
              <p className="text-sm text-brand-muted">
                Share each link so the recipient can enter their own shipping address.
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-brand-sand text-sm">
              {selfClaimRecipients.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-brand-ink">{r.full_name || "Unnamed recipient"}</span>
                  <ClaimLink token={r.claim_token as string} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div>
          <Link
            href="/catalog"
            className="inline-block rounded-md bg-brand-berry px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-berry-dark"
          >
            Back to catalog
          </Link>
        </div>
      </div>
    </main>
  );
}

function ConfirmedHeader({ paidTotal }: { paidTotal: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium uppercase tracking-wide text-brand-gold">
        Payment confirmed
      </span>
      <h1 className="text-3xl font-semibold text-brand-ink sm:text-4xl">
        Your order is placed 🎁
      </h1>
      <p className="max-w-xl text-brand-muted">
        Thank you — we&apos;ve received your payment of{" "}
        <span className="font-medium text-brand-ink">{paidTotal}</span>. The Happy Box team
        will take it from here and prepare your gifts with care.
      </p>
    </div>
  );
}

function PendingHeader({ refreshHref }: { refreshHref: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium uppercase tracking-wide text-brand-gold">
          Almost there
        </span>
        <h1 className="text-3xl font-semibold text-brand-ink sm:text-4xl">
          Confirming your payment…
        </h1>
        <p className="max-w-xl text-brand-muted">
          Your payment went through and we&apos;re just finishing up the confirmation. This
          usually takes only a moment.
        </p>
      </div>
      <Link
        href={refreshHref}
        className="inline-block w-fit rounded-md border border-brand-berry px-4 py-2 text-sm font-medium text-brand-berry transition hover:bg-brand-berry hover:text-white"
      >
        Refresh
      </Link>
    </div>
  );
}

function brandingLabel(option: BrandingOption | undefined): string {
  if (!option) return "Not chosen";
  return option.price_cents === 0
    ? option.name
    : `${option.name} (+${formatPrice(option.price_cents, option.currency)})`;
}

function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-muted">{term}</dt>
      <dd className="text-brand-ink">{value}</dd>
    </div>
  );
}
