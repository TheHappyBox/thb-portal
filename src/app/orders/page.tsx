import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAccountOrders, type OrderListRow } from "@/lib/order-queries";
import { formatPrice } from "@/lib/pricing";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

export const metadata: Metadata = {
  title: "My orders · The Happy Box",
  description: "View your company's gift orders.",
};

/**
 * Buyer-facing orders dashboard: every order belonging to the logged-in user's
 * company, most recent first. Account-scoped by RLS (a company never sees
 * another's orders). Drafts are clearly distinguished and can be resumed.
 */
export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const orders = await loadAccountOrders();

  return (
    <AppShell
      title="My orders"
      actions={<Button render={<Link href="/orders/new" />}>Start a new order</Button>}
    >
      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function OrderRow({ order }: { order: OrderListRow }) {
  const isDraft = order.status === "draft";
  return (
    <li className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {order.recipientCount}{" "}
            {order.recipientCount === 1 ? "recipient" : "recipients"}
            {order.recipientCount > 0 && (
              <> · {order.claimedCount}/{order.recipientCount} claimed</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-lg font-semibold text-foreground">
            {formatPrice(order.totalCents, order.currency)}
          </span>
          <div className="flex items-center gap-3 text-sm">
            {isDraft && (
              <Link
                href={`/orders/new?draft=${order.id}`}
                className="font-medium text-primary underline-offset-4 transition hover:underline"
              >
                Resume
              </Link>
            )}
            <Link
              href={`/orders/${order.id}`}
              className="text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <p className="text-lg font-medium text-foreground">No orders yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        When you build your first gift order it&apos;ll show up here, along with its
        status and recipients.
      </p>
      <Button render={<Link href="/orders/new" />}>Start your first order</Button>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(iso));
}
