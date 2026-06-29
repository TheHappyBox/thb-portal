import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Gated dashboard. Only logged-in users reach it; everyone else is sent to
 * /login. It reads the user's company (via RLS, so only their own account is
 * visible) and shows the company name — the end-to-end proof that auth + the
 * database + RLS all work together.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS guarantees these only ever return the logged-in user's own rows.
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("full_name, role, account_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    // Surface the problem rather than failing silently.
    throw new Error(`Could not load your profile: ${profileError.message}`);
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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <header className="flex items-center justify-between">
        <span className="text-sm text-gray-500">The Happy Box · Portal</span>
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Welcome, {companyName}</h1>
        <p className="text-sm text-gray-500">
          You&apos;re signed in as {profile?.full_name || user.email}
          {profile?.role ? ` (${profile.role})` : ""}.
        </p>
      </div>

      <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
        This is your gifting dashboard. Building orders and managing recipients
        will live here as we build them out.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/orders/new"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Start a new order →
        </Link>
        <Link
          href="/orders"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
        >
          View my orders
        </Link>
        <Link
          href="/catalog"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
        >
          Browse the catalog
        </Link>
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
        >
          Account settings
        </Link>
      </div>
    </main>
  );
}
