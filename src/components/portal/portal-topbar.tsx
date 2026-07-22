"use client";

import { Bell, Plus, Search } from "lucide-react";
import { AccountMenu } from "@/components/portal/account-menu";
import { NewOrderMenu } from "@/components/portal/new-order-menu";

/**
 * The shared topbar for the redesigned portal pages, from the Figma: an optional
 * page title on the left, then a search field, a notifications bell, the account
 * avatar, and the primary "New order" action.
 *
 * Search and notifications are shown but DISABLED — those features don't exist
 * yet, so they're presented honestly (dimmed, "coming soon") rather than faked.
 * The avatar opens the real account menu (settings + sign out); "New order" is a
 * real link into the order builder. Pass `title` to show a heading on the left
 * (e.g. the catalog); omit it and the actions sit alone on the right (dashboard).
 */
export function PortalTopbar({
  title,
  userName,
  companyName,
  email,
  initials,
}: {
  title?: string;
  userName: string;
  companyName: string;
  email: string;
  initials: string;
}) {
  return (
    <header
      className={`flex items-center gap-6 bg-brand-cream px-10 py-6 ${
        title ? "justify-between" : "justify-end"
      }`}
    >
      {title && <h1 className="text-[28px] font-extrabold text-brand-navy">{title}</h1>}

      <div className="flex items-center gap-6">
        {/* Decorative search — not wired up yet */}
        <div
          aria-hidden="true"
          title="Search is coming soon"
          className="hidden w-[280px] items-center gap-2.5 rounded-lg border border-brand-border-warm bg-white px-4 py-2.5 md:flex"
        >
          <Search className="size-[18px] text-brand-ink-soft" />
          <span className="text-[14px] text-brand-ink-soft">Search boxes, orders…</span>
        </div>

        {/* Notifications — coming soon */}
        <button
          type="button"
          disabled
          aria-label="Notifications (coming soon)"
          title="Notifications are coming soon"
          className="flex-none text-brand-navy opacity-70"
        >
          <Bell className="size-6" />
        </button>

        {/* Account menu */}
        <AccountMenu
          initials={initials}
          userName={userName}
          companyName={companyName}
          email={email}
        />

        {/* Primary action — forks into a single or bulk send */}
        <NewOrderMenu
          triggerLabel="New order"
          triggerClassName="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-brand-yellow px-6 text-[15px] font-bold text-brand-navy outline-none transition hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" /> New order
        </NewOrderMenu>
      </div>
    </header>
  );
}
