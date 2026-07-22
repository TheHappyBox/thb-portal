import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, RefreshCw, User, Users, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadAccountOrders, type OrderListRow } from "@/lib/order-queries";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalTopbar } from "@/components/portal/portal-topbar";
import { StatusPill } from "@/components/dashboard/status-pill";
import { BoxCard } from "@/components/dashboard/box-card";
import type { ProductWithRelations } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Dashboard · The Happy Box",
};

/**
 * Dashboard — the Figma redesign, wired to the company's REAL data (profile,
 * orders, catalog boxes). This route carries its own sidebar + topbar to match
 * the design; the rest of the app keeps the shared shell. No prices are shown,
 * and features we don't have yet (search, notifications, custom-box requests)
 * are presented honestly rather than faked.
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

  const companyName: string = account?.name ?? "";
  const userName: string = profile.full_name ?? "";
  const email = user.email ?? "";
  const firstName = userName.split(" ")[0] || companyName || "there";
  const initials =
    (userName || companyName || email || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const today = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  // Real orders → activity metrics + recent list (account-scoped by RLS).
  const orders = await loadAccountOrders();
  const activeCount = orders.filter((o) => o.status === "paid").length;
  const draftCount = orders.filter((o) => o.status === "draft").length;
  const recent = orders.slice(0, 3);

  // Real catalog boxes (Shopify-synced), featured first.
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("*, category:categories(name, slug), variants:product_variants(*)")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(8);
  if (productError) {
    throw new Error(`Could not load the catalog: ${productError.message}`);
  }
  const products = (productData ?? []) as ProductWithRelations[];
  // Two rows matching the Figma — "Your customized boxes" then "Featured boxes".
  // Boxes come ordered featured-first (see query); the "Featured" badge on each
  // card marks the featured ones. The second row only appears when the catalog
  // has more than four boxes to show.
  const primaryBoxes = products.slice(0, 4);
  const secondaryBoxes = products.slice(4, 8);

  return (
    <div className="flex min-h-screen bg-brand-cream text-brand-navy">
      <PortalSidebar active="dashboard" ordersBadge={draftCount} />

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalTopbar
          userName={userName}
          companyName={companyName}
          email={email}
          initials={initials}
        />

        <main className="flex flex-col gap-10 px-10 pb-10">
          {/* Welcome + activity stats */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-[32px] font-extrabold text-brand-navy">
                Welcome back, {firstName}
              </h1>
              <p className="text-[16px] text-brand-ink-soft">{today}</p>
            </div>
            <div className="flex gap-3">
              <StatCard value={activeCount} label="active orders" />
              <StatCard value={draftCount} label="draft orders" />
            </div>
          </div>

          {/* Recent orders */}
          <section className="flex flex-col gap-4">
            <SectionHeader title="Recent orders" linkHref="/orders" linkLabel="View all orders →" />
            {recent.length === 0 ? (
              <div className="rounded-[10px] border border-brand-border-warm bg-white px-6 py-8 text-center text-[14px] text-brand-ink-soft">
                No orders yet.{" "}
                <Link href="/orders/new?mode=single" className="font-bold text-brand-navy underline">
                  Start your first order →
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[10px] border border-brand-border-warm bg-white">
                <div className="flex gap-3 bg-brand-sand px-4 py-3 text-[12px] font-extrabold text-brand-ink-soft">
                  <span className="flex-1">Order name</span>
                  <span className="w-[140px]">Recipients</span>
                  <span className="w-[160px]">Status</span>
                  <span className="w-[120px]">Date</span>
                </div>
                {recent.map((order) => (
                  <RecentOrderRow key={order.id} order={order} />
                ))}
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="flex flex-wrap gap-6">
            <QuickAction
              href="/orders/new?mode=single"
              icon={User}
              label="Send to one person"
              tile="bg-brand-yellow"
              iconWrap="bg-white"
              iconColor="text-brand-navy"
              labelColor="text-brand-navy"
            />
            <QuickAction
              href="/orders/new?mode=multiple"
              icon={Users}
              label="Send to many"
              tile="bg-brand-teal"
              iconWrap="bg-white/[0.13]"
              iconColor="text-white"
              labelColor="text-white"
            />
            <QuickAction
              href="/orders"
              icon={RefreshCw}
              label="View your orders"
              tile="bg-brand-navy"
              iconWrap="bg-white/[0.13]"
              iconColor="text-white"
              labelColor="text-white"
            />
          </section>

          {/* Catalog boxes */}
          {products.length === 0 ? (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Your boxes" />
              <div className="flex flex-col items-start gap-4 rounded-[12px] border border-brand-border-warm bg-white p-8">
                <div className="flex size-12 items-center justify-center rounded-lg bg-brand-yellow">
                  <Gift className="size-6 text-brand-navy" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[18px] font-extrabold text-brand-navy">
                    Request your own custom box
                  </p>
                  <p className="max-w-md text-[14px] text-brand-ink-soft">
                    There aren&apos;t any boxes in your catalog yet. Start an order and our team
                    will help you build a box tailored to your company.
                  </p>
                </div>
                <Link
                  href="/orders/new?mode=single"
                  className="rounded-md bg-brand-yellow px-6 py-2.5 text-[15px] font-bold text-brand-navy transition hover:brightness-95"
                >
                  Start an order →
                </Link>
              </div>
            </section>
          ) : (
            <>
              <BoxSection title="Your customized boxes" boxes={primaryBoxes} />
              {secondaryBoxes.length > 0 && (
                <BoxSection title="Featured boxes" boxes={secondaryBoxes} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex h-[68px] w-[148px] flex-col justify-center gap-1 rounded-[10px] border border-brand-stat-border bg-brand-stat px-4 py-3">
      <p className="text-[28px] font-bold leading-none text-brand-navy">{value}</p>
      <p className="text-[12px] font-medium text-brand-ink-soft">{label}</p>
    </div>
  );
}

function SectionHeader({
  title,
  linkHref,
  linkLabel,
}: {
  title: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[20px] font-extrabold text-brand-navy">{title}</h2>
      {linkHref && linkLabel && (
        <Link href={linkHref} className="text-[14px] font-bold text-brand-navy underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function RecentOrderRow({ order }: { order: OrderListRow }) {
  const date = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(
    new Date(order.createdAt),
  );
  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center gap-3 border-b border-brand-border-warm px-4 py-3.5 transition-colors last:border-b-0 hover:bg-brand-sand/50"
    >
      <span className="flex-1 truncate text-[14px] font-bold text-brand-navy">{order.title}</span>
      <span className="w-[140px] text-[14px] text-brand-ink-soft">
        {order.recipientCount} recipient{order.recipientCount === 1 ? "" : "s"}
      </span>
      <span className="w-[160px]">
        <StatusPill status={order.status} />
      </span>
      <span className="w-[120px] text-[14px] text-brand-ink-soft">{date}</span>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  tile,
  iconWrap,
  iconColor,
  labelColor,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tile: string;
  iconWrap: string;
  iconColor: string;
  labelColor: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-[240px] flex-1 items-center gap-5 rounded-[12px] p-6 transition hover:-translate-y-0.5 hover:shadow-md ${tile}`}
    >
      <span className={`flex size-12 flex-none items-center justify-center rounded-lg ${iconWrap}`}>
        <Icon className={`size-6 ${iconColor}`} />
      </span>
      <span className={`text-[18px] font-extrabold ${labelColor}`}>{label}</span>
    </Link>
  );
}

function BoxSection({ title, boxes }: { title: string; boxes: ProductWithRelations[] }) {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeader title={title} linkHref="/catalog" linkLabel="See all boxes →" />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {boxes.map((product) => (
          <BoxCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
