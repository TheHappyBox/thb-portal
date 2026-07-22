import Link from "next/link";
import { BarChart3, LayoutDashboard, Package, Search, Users, UsersRound } from "lucide-react";

/**
 * The shared left sidebar for the redesigned portal pages (dashboard, catalog,
 * …), rebuilt to match the Figma: the pink "The Happy Box" wordmark, a
 * yellow-tinted active state, and the app's real nav. Live destinations
 * (Dashboard / Browse catalog / Orders) are real; not-yet-built areas
 * (Recipients / Team / Reports) are shown dimmed with a "Soon" tag rather than
 * faked. The `active` prop marks which page is current.
 *
 * Scoped to the redesigned routes; the rest of the app keeps its current shell.
 */
type NavKey = "dashboard" | "catalog" | "orders";

const NAV: { key: NavKey; href: string; label: string; icon: typeof Package; badge?: boolean }[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "catalog", href: "/catalog", label: "Browse catalog", icon: Search },
  { key: "orders", href: "/orders", label: "Orders", icon: Package, badge: true },
];

export function PortalSidebar({
  active,
  ordersBadge,
}: {
  active: NavKey;
  ordersBadge: number;
}) {
  return (
    <aside className="sticky top-0 flex h-screen w-[260px] flex-none flex-col justify-between border-r border-brand-border-warm bg-white p-8">
      <div className="flex flex-col gap-12">
        <p className="text-[24px] font-extrabold text-brand-pink">The Happy Box</p>

        <nav className="flex flex-col gap-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isActive
                    ? "rounded-lg bg-brand-yellow/[0.13]"
                    : "rounded-xl hover:bg-brand-yellow/[0.13]"
                }`}
              >
                <Icon className={`size-5 ${isActive ? "text-brand-navy" : "text-brand-ink-soft"}`} />
                <span
                  className={`flex-1 text-[15px] ${
                    isActive ? "font-bold text-brand-navy" : "font-medium text-brand-ink-soft"
                  }`}
                >
                  {item.label}
                </span>
                {item.badge && ordersBadge > 0 && (
                  <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[12px] font-bold text-white">
                    {ordersBadge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="flex flex-col gap-2 pt-4">
            <SoonItem icon={Users} label="Recipients" />
            <SoonItem icon={UsersRound} label="Team" />
            <SoonItem icon={BarChart3} label="Reports" />
          </div>
        </nav>
      </div>
    </aside>
  );
}

function SoonItem({ icon: Icon, label }: { icon: typeof Package; label: string }) {
  return (
    <div
      aria-disabled="true"
      title="Coming soon"
      className="flex cursor-not-allowed items-center gap-3 px-4 py-3 opacity-40"
    >
      <Icon className="size-5 text-brand-ink-soft" />
      <span className="flex-1 text-[15px] font-medium text-brand-ink-soft">{label}</span>
      <span className="text-[10px] font-bold uppercase text-brand-ink-soft">Soon</span>
    </div>
  );
}
