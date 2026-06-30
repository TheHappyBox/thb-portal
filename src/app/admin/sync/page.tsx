import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { SignOutButton } from "@/components/sign-out-button";
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <header className="flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 transition hover:text-black dark:hover:text-white">
          ← Dashboard
        </Link>
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Internal · platform</span>
        <h1 className="text-3xl font-semibold">Catalog sync</h1>
        <p className="text-sm text-gray-500">
          Pull the latest <strong>active</strong> products from Shopify and reconcile them into the
          portal catalog. Shopify is the source of truth. Read-only against Shopify; safe to run
          repeatedly.
        </p>
      </div>

      <SyncButton />

      <p className="text-xs text-gray-400">
        Archived/unlisted products are hidden (not deleted). If Shopify returns an error or an
        implausibly small result, the sync aborts and changes nothing.
      </p>
    </main>
  );
}
