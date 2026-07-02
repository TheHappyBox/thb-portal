import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { ProfileSection } from "@/components/settings/profile-section";
import { CompanySection, type CompanyInfo } from "@/components/settings/company-section";
import { PasswordSection } from "@/components/settings/password-section";
import { BrandAssetsManager } from "@/components/settings/brand-assets-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadBrandAssets } from "@/lib/brand-assets";

export const metadata: Metadata = {
  title: "Account settings · The Happy Box",
  description: "Manage your profile, company info, and password.",
};

/**
 * Gated account settings. Each section shows its details read-only by default and
 * switches into an edit form (Save/Cancel) on demand. A member edits THEIR OWN
 * profile and THEIR OWN company — account-scoped by RLS, and every save action
 * re-verifies auth (the page gate alone is never trusted).
 */
export default async function SettingsPage() {
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
    .select("name, address_line1, address_line2, city, region, postal_code, country")
    .eq("id", profile.account_id)
    .single();
  if (accountError || !account) {
    throw new Error(`Could not load your company: ${accountError?.message ?? "not found"}`);
  }

  const brandAssets = await loadBrandAssets();

  return (
    <AppShell
      title="Account settings"
      description="Manage your profile, your company's details, and your password."
    >
      <div className="flex max-w-2xl flex-col gap-6">
        <ProfileSection fullName={profile.full_name ?? ""} email={user.email ?? ""} />

        <CompanySection company={account as CompanyInfo} />

        <Card>
          <CardHeader>
            <CardTitle>Brand logos</CardTitle>
            <CardDescription>
              Upload your company logos so they&apos;re on file for your branded gifts. Stored
              privately — only your company can see them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandAssetsManager assets={brandAssets} />
          </CardContent>
        </Card>

        <PasswordSection />
      </div>
    </AppShell>
  );
}
