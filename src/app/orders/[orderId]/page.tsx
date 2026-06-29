import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOrderDetail, type OrderDetailRecipient } from "@/lib/order-queries";
import { formatPrice } from "@/lib/pricing";
import { SignOutButton } from "@/components/sign-out-button";
import { ProductImage } from "@/components/product-image";
import { ClaimLink } from "@/components/order-builder/claim-link";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { BrandingOption } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Order details · The Happy Box",
  description: "View one of your gift orders.",
};

/**
 * General-purpose order detail view (distinct from the post-payment
 * /orders/[orderId]/confirmation page, which stays as the celebratory receipt).
 * Account-scoped by RLS: a buyer can only open their own order; anything else
 * 404s. Drafts can be resumed back into the builder; paid orders are view-only.
 */
export default async function OrderDetailPage({
  params,
}: {
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

  const isDraft = order.status === "draft";

  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/orders"
            className="text-sm text-brand-muted transition hover:text-brand-ink"
          >
            ← My orders
          </Link>
          <SignOutButton />
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span className="text-sm text-brand-muted">{formatDate(order.createdAt)}</span>
            </div>
            <h1 className="text-2xl font-semibold text-brand-ink sm:text-3xl">Order details</h1>
          </div>
          {isDraft && (
            <Link
              href={`/orders/new?draft=${order.id}`}
              className="rounded-md bg-brand-berry px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-berry-dark"
            >
              Resume this order →
            </Link>
          )}
        </div>

        {/* Boxes */}
        <section className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-brand-muted">Boxes</h2>
          {order.views.length === 0 ? (
            <p className="text-sm text-brand-muted">No boxes chosen yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-brand-sand">
              {order.views.map((view) => (
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
                      {view.variant.name} · {formatPrice(view.variant.price_cents, order.currency)}{" "}
                      × {view.quantity}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-brand-ink">
                    {formatPrice(view.lineTotalCents, order.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gift options */}
        <section className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            Gift options
          </h2>
          <dl className="flex flex-col gap-1 text-sm">
            <Row term="Message card" value={brandingLabel(order.messageCard, order.currency)} />
            <Row term="Box branding" value={brandingLabel(order.boxBranding, order.currency)} />
          </dl>
          {order.sharedMessage?.trim() && (
            <p className="rounded-md bg-brand-cream px-3 py-2 text-sm italic text-brand-ink">
              “{order.sharedMessage.trim()}”
            </p>
          )}
        </section>

        {/* Recipients */}
        <section className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            Recipients ({order.recipients.length})
          </h2>
          {order.recipients.length === 0 ? (
            <p className="text-sm text-brand-muted">No recipients added yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-brand-sand">
              {order.recipients.map((r, i) => (
                <RecipientItem key={i} recipient={r} />
              ))}
            </ul>
          )}
        </section>

        {/* Total */}
        <div className="flex items-center justify-between rounded-xl border border-brand-sand bg-white p-4">
          <span className="font-semibold text-brand-ink">
            {order.status === "paid" ? "Total paid" : "Order total"}
          </span>
          <span className="text-xl font-semibold text-brand-ink">
            {formatPrice(order.totalCents, order.currency)}
          </span>
        </div>
      </div>
    </main>
  );
}

function RecipientItem({ recipient }: { recipient: OrderDetailRecipient }) {
  const claimed = recipient.claimStatus === "claimed" || recipient.claimStatus === "fulfilled";
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-brand-ink">
          {recipient.fullName || "Unnamed recipient"}
        </span>
        <span className="text-xs text-brand-muted">
          {recipient.selfClaim
            ? claimed
              ? "Self-claim · address provided"
              : "Self-claim · awaiting address"
            : recipient.hasAddress
              ? `Address provided${recipient.city ? ` · ${recipient.city}` : ""}`
              : "No address yet"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            claimed ? "bg-brand-berry/10 text-brand-berry" : "bg-brand-sand text-brand-muted"
          }`}
        >
          {claimed ? "Claimed" : "Invited"}
        </span>
        {recipient.selfClaim && recipient.claimToken && (
          <ClaimLink token={recipient.claimToken} />
        )}
      </div>
    </li>
  );
}

function brandingLabel(option: BrandingOption | undefined, currency: string): string {
  if (!option) return "Not chosen";
  return option.price_cents === 0
    ? option.name
    : `${option.name} (+${formatPrice(option.price_cents, currency)})`;
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-muted">{term}</dt>
      <dd className="text-brand-ink">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(iso));
}
