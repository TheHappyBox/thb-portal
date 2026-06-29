import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { CompanyForm, type CompanyInfo } from "@/components/settings/company-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const metadata: Metadata = {
  title: "Account settings · The Happy Box",
  description: "Manage your profile, company info, and password.",
};

/**
 * Gated account settings. A member edits THEIR OWN profile and THEIR OWN
 * company's details — account-scoped by RLS. Auth is re-verified in every save
 * action too (the page gate alone is never trusted).
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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <header className="flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 transition hover:text-black dark:hover:text-white">
          ← Dashboard
        </Link>
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Account settings</h1>
        <p className="text-sm text-gray-500">
          Manage your profile, your company&apos;s details, and your password.
        </p>
      </div>

      <Section title="Your profile">
        <ProfileForm fullName={profile.full_name ?? ""} email={user.email ?? ""} />
      </Section>

      <Section
        title="Company info"
        description="Your company's details — used on your orders. This is your company, not The Happy Box."
      >
        <CompanyForm company={account as CompanyInfo} />
      </Section>

      <Section title="Password" description="Set a new password for signing in.">
        <ChangePasswordForm />
      </Section>
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-gray-200 p-5 dark:border-gray-800">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}
