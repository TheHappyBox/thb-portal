import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Package,
  Plus,
  Settings as SettingsIcon,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadAccountOrders, type OrderListRow } from "@/lib/order-queries";
import { formatPrice, priceLabel } from "@/lib/pricing";
import { withAvailableVariants } from "@/lib/order-builder";
import { AppShell } from "@/components/app-shell";
import { ProductImage } from "@/components/product-image";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import type { ProductWithRelations } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Dashboard · The Happy Box",
};

/**
 * Dashboard — a POC replicating a provided sidebar design, adapted to our brand
 * tokens + shadcn components and populated with the company's REAL data (orders,
 * recipients, featured catalog boxes). Sidebar layout is scoped to this page for
 * the POC; the rest of the app keeps the top-nav shell.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("full_name, account_id")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Could not load your profile: ${profileError?.message ?? "not found"}`);
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", profile.account_id)
    .single();
  if (accountError) {
    throw new Error(`Could not load your company: ${accountError.message}`);
  }

  const companyName = account?.name ?? "your company";
  const userName = profile.full_name ?? "";

  // Real orders → metrics + recent list (account-scoped by RLS).
  const orders = await loadAccountOrders();
  const totalOrders = orders.length;
  const draftCount = orders.filter((o) => o.status === "draft").length;
  const paidCount = orders.filter((o) => o.status === "paid").length;
  const recipientTotal = orders.reduce((sum, o) => sum + o.recipientCount, 0);
  const recent = orders.slice(0, 5);

  // Featured catalog boxes (real Shopify-synced products, featured first).
  const { data: productData } = await supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(4);
  const featured = withAvailableVariants((productData ?? []) as ProductWithRelations[]);

  const greeting = userName || companyName;

  return (
    <AppShell
      title={`Welcome back${greeting ? `, ${greeting}` : ""}`}
      actions={
        <Button render={<Link href="/orders/new" />}>
          <Plus className="size-4" /> New order
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
            {/* Metric cards — activity only, computed from real data */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard icon={Package} label="Total orders" value={totalOrders} sub={`${paidCount} paid · ${draftCount} draft`} />
              <MetricCard icon={FileText} label="In progress" value={draftCount} sub="drafts you can resume" />
              <MetricCard icon={CheckCircle2} label="Paid" value={paidCount} sub="orders placed" />
              <MetricCard
                icon={Users}
                label="Recipients"
                value={recipientTotal}
                sub={`across ${totalOrders} order${totalOrders === 1 ? "" : "s"}`}
              />
            </div>

            {/* Quick actions */}
            <section>
              <h2 className="mb-3 text-[13px] font-semibold text-muted-foreground">Quick actions</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <QuickAction
                  href="/orders/new"
                  tile="bg-brand-yellow-soft"
                  iconColor="text-brand-navy"
                  icon={Plus}
                  title="Start a new order"
                  desc="Pick a box, add recipients, check out."
                />
                <QuickAction
                  href="/catalog"
                  tile="bg-brand-ice"
                  iconColor="text-brand-teal"
                  icon={Store}
                  title="Browse the catalog"
                  desc="Explore every curated gift box."
                />
                <QuickAction
                  href="/settings"
                  tile="bg-brand-pink-soft"
                  iconColor="text-brand-pink-deep"
                  icon={SettingsIcon}
                  title="Account settings"
                  desc="Company info, brand logos, password."
                />
              </div>
            </section>

            {/* Featured boxes + recent orders */}
            <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold text-muted-foreground">Featured boxes</h2>
                  <Link href="/catalog" className="text-[12.5px] font-semibold text-primary hover:underline">
                    Browse all →
                  </Link>
                </div>
                {featured.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                    No boxes in the catalog yet.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {featured.map((p) => (
                      <FeaturedCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
                  <h2 className="text-[13px] font-semibold text-muted-foreground">Recent orders</h2>
                  <Link href="/orders" className="text-xs font-semibold text-primary hover:underline">
                    All
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">
                    No orders yet.{" "}
                    <Link href="/orders/new" className="font-medium text-primary hover:underline">
                      Start one →
                    </Link>
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {recent.map((o) => (
                      <RecentOrderRow key={o.id} order={o} />
                    ))}
                  </div>
                )}
              </section>
            </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-muted-foreground">{label}</span>
        <Icon className="size-[15px] text-muted-foreground" />
      </div>
      <div className="mt-2 text-[26px] font-bold leading-none tracking-tight text-foreground">{value}</div>
      <div className="mt-1.5 text-[11.5px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function QuickAction({
  href,
  tile,
  iconColor,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  tile: string;
  iconColor: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex size-10 flex-none items-center justify-center rounded-lg ${tile}`}>
        <Icon className={`size-[19px] ${iconColor}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}

function FeaturedCard({ product }: { product: ProductWithRelations }) {
  const href = product.shopify_handle ? `/catalog/${product.shopify_handle}` : "/catalog";
  return (
    <Link
      href={href}
      className="overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden">
        <ProductImage src={product.image_url} alt={product.name} />
        {product.is_featured && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-semibold text-secondary-foreground">
            Featured
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-[13.5px] font-semibold text-foreground">{product.name}</div>
        {product.description && (
          <div className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">
            {product.description}
          </div>
        )}
        <div className="mt-2 text-[13px] font-semibold text-foreground">
          {priceLabel(product.variants)}
          <span className="font-normal text-muted-foreground"> / box</span>
        </div>
      </div>
    </Link>
  );
}

function RecentOrderRow({ order }: { order: OrderListRow }) {
  const dot = order.status === "paid" ? "bg-brand-teal" : "bg-brand-yellow-deep";
  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center gap-3 border-t border-border px-4 py-2.5 transition hover:bg-muted/50"
    >
      <span className={`size-2 flex-none rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-foreground">
          {formatPrice(order.totalCents, order.currency)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {order.recipientCount} recipient{order.recipientCount === 1 ? "" : "s"} ·{" "}
          {formatDate(order.createdAt)}
        </div>
      </div>
      <OrderStatusBadge status={order.status} />
    </Link>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(iso));
}
