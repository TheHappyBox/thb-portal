import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOrderDetail, type OrderDetailRecipient } from "@/lib/order-queries";
import { formatPrice } from "@/lib/pricing";
import { AppShell } from "@/components/app-shell";
import { ProductImage } from "@/components/product-image";
import { ClaimLink } from "@/components/order-builder/claim-link";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <AppShell
      title="Order details"
      actions={
        isDraft ? (
          <Button render={<Link href={`/orders/new?draft=${order.id}`} />}>
            Resume this order
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
        </div>

        {/* Boxes */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Boxes</h2>
          {order.views.length === 0 ? (
            <p className="text-sm text-muted-foreground">No boxes chosen yet.</p>
          ) : (
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
                      {view.variant.name} · {formatPrice(view.variant.price_cents, order.currency)}{" "}
                      × {view.quantity}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatPrice(view.lineTotalCents, order.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gift options */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Gift options
          </h2>
          <dl className="flex flex-col gap-1 text-sm">
            <Row term="Message card" value={brandingLabel(order.messageCard, order.currency)} />
            <Row term="Box branding" value={brandingLabel(order.boxBranding, order.currency)} />
          </dl>
          {order.sharedMessage?.trim() && (
            <p className="rounded-md bg-muted/40 px-3 py-2 text-sm italic text-foreground">
              “{order.sharedMessage.trim()}”
            </p>
          )}
        </section>

        {/* Recipients */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recipients ({order.recipients.length})
          </h2>
          {order.recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipients added yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {order.recipients.map((r, i) => (
                <RecipientItem key={i} recipient={r} />
              ))}
            </ul>
          )}
        </section>

        {/* Total */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <span className="font-semibold text-foreground">
            {order.status === "paid" ? "Total paid" : "Order total"}
          </span>
          <span className="text-xl font-semibold text-foreground">
            {formatPrice(order.totalCents, order.currency)}
          </span>
        </div>
      </div>
    </AppShell>
  );
}

function RecipientItem({ recipient }: { recipient: OrderDetailRecipient }) {
  const claimed = recipient.claimStatus === "claimed" || recipient.claimStatus === "fulfilled";
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground">
          {recipient.fullName || "Unnamed recipient"}
        </span>
        <span className="text-xs text-muted-foreground">
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
        <Badge variant={claimed ? "default" : "secondary"}>{claimed ? "Claimed" : "Invited"}</Badge>
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
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(iso));
}
