import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOrderDetail } from "@/lib/order-queries";
import { AppShell } from "@/components/app-shell";
import { ProductImage } from "@/components/product-image";
import { ClaimLink } from "@/components/order-builder/claim-link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/pricing";
import type { BrandingOption } from "@/types/catalog";

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
 *
 * Data loading is shared with the orders list/detail via loadOrderDetail.
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

  const order = await loadOrderDetail(orderId);
  if (!order) {
    notFound();
  }

  const isPaid = order.status === "paid";
  const selfClaimRecipients = order.recipients.filter((r) => r.selfClaim && r.claimToken);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        {isPaid ? (
          <ConfirmedHeader paidTotal={formatPrice(order.totalCents, order.currency)} />
        ) : (
          <PendingHeader refreshHref={`/orders/${orderId}/confirmation`} />
        )}

        {/* Order summary */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Order summary</h2>

          {order.views.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {order.views.map((view) => (
                <li
                  key={`${view.productId}-${view.variantId}`}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-border">
                    <ProductImage src={view.product.image_url} alt={view.product.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{view.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {view.variant.name} ·{" "}
                      {formatPrice(view.variant.price_cents, order.currency)} × {view.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <dl className="flex flex-col gap-1 text-sm">
            <SummaryRow term="Message card" value={brandingLabel(order.messageCard)} />
            <SummaryRow term="Box branding" value={brandingLabel(order.boxBranding)} />
            <SummaryRow
              term="Recipients"
              value={`${order.recipients.length} ${
                order.recipients.length === 1 ? "recipient" : "recipients"
              }`}
            />
          </dl>

          {(order.giftTo?.trim() || order.giftFrom?.trim() || order.sharedMessage?.trim()) && (
            <div className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">
              {order.giftTo?.trim() && (
                <p>
                  <span className="font-medium">To:</span> {order.giftTo.trim()}
                </p>
              )}
              {order.giftFrom?.trim() && (
                <p>
                  <span className="font-medium">From:</span> {order.giftFrom.trim()}
                </p>
              )}
              {order.sharedMessage?.trim() && <p className="italic">“{order.sharedMessage.trim()}”</p>}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="font-semibold text-foreground">
              {isPaid ? "Total paid" : "Order total"}
            </span>
            <span className="text-xl font-semibold text-foreground">
              {formatPrice(order.totalCents, order.currency)}
            </span>
          </div>
        </section>

        {/* Self-claim links (emailing them is a later step). */}
        {selfClaimRecipients.length > 0 && (
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">Self-claim links</h2>
              <p className="text-sm text-muted-foreground">
                Share each link so the recipient can enter their own shipping address.
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-border text-sm">
              {selfClaimRecipients.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-foreground">{r.fullName || "Unnamed recipient"}</span>
                  <ClaimLink token={r.claimToken as string} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/orders" />}>View my orders</Button>
          <Button variant="outline" render={<Link href="/catalog" />}>
            Back to catalog
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function ConfirmedHeader({ paidTotal }: { paidTotal: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Payment confirmed
      </span>
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
        Your order is placed 🎁
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Thank you — we&apos;ve received your payment of{" "}
        <span className="font-medium text-foreground">{paidTotal}</span>. The Happy Box team
        will take it from here and prepare your gifts with care.
      </p>
    </div>
  );
}

function PendingHeader({ refreshHref }: { refreshHref: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Almost there
        </span>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Confirming your payment…
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Your payment went through and we&apos;re just finishing up the confirmation. This
          usually takes only a moment.
        </p>
      </div>
      <Button variant="outline" render={<Link href={refreshHref} />} className="w-fit">
        Refresh
      </Button>
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
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
