import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password · The Happy Box",
  description: "Choose a new password for your account.",
};

/**
 * Target of the password-reset email link. By the time the user lands here,
 * /auth/confirm has exchanged the emailed token for a short-lived recovery
 * session. If that session is present we let them set a new password; otherwise
 * the link was invalid/expired and we say so plainly.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold">This link has expired</h1>
        <p className="text-sm text-gray-500">
          Your password-reset link is invalid or has already been used. Please request
          a fresh one.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="text-sm text-gray-500">Choose a new password for your account.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
