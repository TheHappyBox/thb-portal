import type { ReactNode } from "react";
import { Bell, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AppSidebar } from "@/components/app-sidebar";

/**
 * The one shared shell for authenticated pages: a left sidebar (nav + account) and
 * a topbar (page title + decorative search/bell + page actions), with a consistent
 * content container. Pages keep their own auth gate + inner content and pass
 * `title` / `description` / `actions`; this only provides the frame + nav.
 *
 * Reads a little chrome data (the user's name/company, an Orders draft-count badge,
 * and platform-admin status) — all account-scoped by RLS. It does not gate.
 */
export async function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "";
  let companyName = "";
  let draftBadge = 0;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, account_id")
      .eq("id", user.id)
      .maybeSingle();
    userName = profile?.full_name ?? "";
    if (profile?.account_id) {
      const { data: account } = await supabase
        .from("accounts")
        .select("name")
        .eq("id", profile.account_id)
        .maybeSingle();
      companyName = account?.name ?? "";
    }
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");
    draftBadge = count ?? 0;
  }
  const isAdmin = isPlatformAdmin(user?.email);

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AppSidebar
        userName={userName}
        companyName={companyName}
        email={user?.email ?? ""}
        ordersBadge={draftBadge}
        isAdmin={isAdmin}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-none items-center gap-4 border-b border-border bg-background px-7 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">The Happy Box · Portal</div>
            {title && (
              <div className="truncate text-lg font-semibold tracking-tight text-foreground">
                {title}
              </div>
            )}
          </div>

          {/* Decorative placeholders (search + notifications aren't built yet) */}
          <div
            aria-hidden="true"
            className="hidden w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground lg:flex"
          >
            <Search className="size-[15px]" /> Search boxes, orders…
          </div>
          <button
            type="button"
            disabled
            aria-label="Notifications (coming soon)"
            title="Coming soon"
            className="flex size-9 flex-none items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
          >
            <Bell className="size-[17px]" />
          </button>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-7 py-6">
            {description && <p className="mb-6 text-muted-foreground">{description}</p>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
