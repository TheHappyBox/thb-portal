import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AppShell } from "@/components/app-shell";
import { SyncButton } from "./sync-button";

export const metadata: Metadata = {
  title: "Catalog sync · The Happy Box (internal)",
  robots: { index: false, follow: false },
};

/**
 * Internal, platform-level page to sync the catalog from Shopify. Gated by the
 * stopgap platform-admin allow-list: a non-admin (any client account) gets a 404,
 * so the page is effectively invisible to them. The action re-checks too.
 */
export default async function CatalogSyncPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  if (!isPlatformAdmin(user.email)) {
    notFound();
  }

  return (
    <AppShell
      title="Catalog sync"
      description="Pull the latest active products from Shopify and reconcile them into the portal catalog. Shopify is the source of truth; read-only against Shopify and safe to run repeatedly."
    >
      <div className="flex max-w-2xl flex-col gap-6">
        <span className="w-fit rounded-full bg-brand-navy px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
          Internal · platform
        </span>

        <SyncButton />

        <p className="text-xs text-muted-foreground">
          Archived/unlisted products are hidden (not deleted). If Shopify returns an error or an
          implausibly small result, the sync aborts and changes nothing.
        </p>
      </div>
    </AppShell>
  );
}
