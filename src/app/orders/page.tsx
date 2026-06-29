import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAccountOrders, type OrderListRow } from "@/lib/order-queries";
import { formatPrice } from "@/lib/pricing";
import { SignOutButton } from "@/components/sign-out-button";
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
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-brand-muted transition hover:text-brand-ink"
          >
            ← Dashboard
          </Link>
          <SignOutButton />
        </header>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium uppercase tracking-wide text-brand-gold">
              The Happy Box
            </span>
            <h1 className="text-3xl font-semibold text-brand-ink sm:text-4xl">My orders</h1>
          </div>
          <Link
            href="/orders/new"
            className="rounded-md bg-brand-berry px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-berry-dark"
          >
            Start a new order →
          </Link>
        </div>

        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function OrderRow({ order }: { order: OrderListRow }) {
  const isDraft = order.status === "draft";
  return (
    <li className="rounded-xl border border-brand-sand bg-white p-4 transition hover:border-brand-berry/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-brand-muted">{formatDate(order.createdAt)}</span>
          </div>
          <p className="text-sm text-brand-muted">
            {order.recipientCount}{" "}
            {order.recipientCount === 1 ? "recipient" : "recipients"}
            {order.recipientCount > 0 && (
              <> · {order.claimedCount}/{order.recipientCount} claimed</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-lg font-semibold text-brand-ink">
            {formatPrice(order.totalCents, order.currency)}
          </span>
          <div className="flex items-center gap-3 text-sm">
            {isDraft && (
              <Link
                href={`/orders/new?draft=${order.id}`}
                className="font-medium text-brand-berry underline transition hover:text-brand-berry-dark"
              >
                Resume
              </Link>
            )}
            <Link
              href={`/orders/${order.id}`}
              className="text-brand-muted underline transition hover:text-brand-ink"
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
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-brand-sand bg-white px-6 py-16 text-center">
      <p className="text-lg font-medium text-brand-ink">No orders yet</p>
      <p className="max-w-sm text-sm text-brand-muted">
        When you build your first gift order it&apos;ll show up here, along with its
        status and recipients.
      </p>
      <Link
        href="/orders/new"
        className="rounded-md bg-brand-berry px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-berry-dark"
      >
        Start your first order →
      </Link>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(iso));
}
