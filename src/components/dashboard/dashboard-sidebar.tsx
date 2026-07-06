"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Gift,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Store,
  Users,
  UsersRound,
} from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Dashboard-only left sidebar — a faithful take on the design's nav, recolored to
 * The Happy Box brand. Real destinations (Dashboard / Catalog / Orders / Settings)
 * are live; not-yet-built areas (Recipients / Team / Reports) are shown disabled
 * with a "Soon" tag rather than faked. NOTE: this is a POC layout scoped to the
 * dashboard; the rest of the app still uses the top-nav shell.
 */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalog", label: "Browse catalog", icon: Store },
  { href: "/orders", label: "Orders", icon: Package, badgeKey: "orders" as const },
];

const SOON = [
  { label: "Recipients", icon: Users },
  { label: "Team", icon: UsersRound },
  { label: "Reports", icon: BarChart3 },
];

export function DashboardSidebar({
  userName,
  companyName,
  email,
  ordersBadge,
}: {
  userName: string;
  companyName: string;
  email: string;
  ordersBadge: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials =
    (userName || companyName || email || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-none flex-col border-r border-border bg-card p-3.5">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-1.5">
        <div className="flex size-9 flex-none items-center justify-center rounded-lg bg-brand-navy text-white">
          <Gift className="size-[18px]" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-foreground">The Happy Box</div>
          <div className="text-[11px] text-muted-foreground">Corporate portal</div>
        </div>
      </div>

      <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Menu
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors ${
                active
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-[17px]" />
              {item.label}
              {item.badgeKey === "orders" && ordersBadge > 0 && (
                <span className="ml-auto rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-semibold text-brand-navy">
                  {ordersBadge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Not-yet-built areas — clearly marked, not faked */}
        {SOON.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              aria-disabled="true"
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-muted-foreground/60"
            >
              <Icon className="size-[17px]" />
              {item.label}
              <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Soon
              </span>
            </div>
          );
        })}
      </nav>

      {/* Bottom: settings + account */}
      <div className="mt-auto flex flex-col gap-0.5">
        <Link
          href="/settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors ${
            isActive("/settings")
              ? "bg-secondary font-medium text-secondary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings className="size-[17px]" />
          Settings
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-muted/60 p-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12.5px] font-semibold text-foreground">
                {userName || "Your account"}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {companyName}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {email || "Signed in"}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" /> Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none hover:bg-muted"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
