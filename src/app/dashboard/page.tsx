import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Gated dashboard landing. Wrapped in the shared shell (header/nav + sign-out).
 * Only logged-in users reach it; everyone else is sent to /login.
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
    <AppShell
      title={`Welcome, ${companyName}`}
      description={`You're signed in as ${profile?.full_name || user.email}${
        profile?.role ? ` (${profile.role})` : ""
      }.`}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/orders/new" />}>Start a new order</Button>
          <Button variant="outline" render={<Link href="/orders" />}>
            View my orders
          </Button>
          <Button variant="outline" render={<Link href="/catalog" />}>
            Browse the catalog
          </Button>
          <Button variant="outline" render={<Link href="/settings" />}>
            Account settings
          </Button>
        </div>

        <Card className="max-w-xl bg-brand-yellow-soft/40">
          <CardHeader>
            <CardTitle>Your gifting dashboard</CardTitle>
            <CardDescription className="text-brand-navy/70">
              Build orders, manage recipients, and track deliveries — all in one place.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
