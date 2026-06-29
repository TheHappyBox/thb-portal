"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Settings form result. Unlike the auth forms (which redirect on success), these
 * stay on the page, so they report success AND error inline.
 */
export type SettingsFormState =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | undefined;

/**
 * Update the logged-in user's OWN profile (just their display name for now).
 * Re-verifies the user server-side; RLS (`users_update_self`) guarantees a user
 * can only ever change their own row.
 */
export async function updateProfile(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be logged in." };

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName || null })
    .eq("id", user.id);
  if (error) {
    return { status: "error", message: `Could not save your profile: ${error.message}` };
  }

  revalidatePath("/settings");
  return { status: "success", message: "Profile saved." };
}

/**
 * Update the buyer company's own name + mailing address. Re-verifies the user,
 * reads their account_id (RLS-scoped), and updates that account. RLS
 * (`accounts_update_own`) guarantees a member can only edit their OWN company.
 */
export async function updateCompany(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { status: "error", message: "Company name is required." };

  const str = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const fields = {
    name,
    address_line1: str("addressLine1"),
    address_line2: str("addressLine2"),
    city: str("city"),
    region: str("region"),
    postal_code: str("postalCode"),
    country: str("country"),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be logged in." };

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return { status: "error", message: "Could not load your account." };
  }

  const { error } = await supabase
    .from("accounts")
    .update(fields)
    .eq("id", profile.account_id);
  if (error) {
    return { status: "error", message: `Could not save company info: ${error.message}` };
  }

  revalidatePath("/settings");
  return { status: "success", message: "Company info saved." };
}

/**
 * Change the logged-in user's password. Re-verifies the user, requires the new
 * password twice, and applies basic strength validation before handing off to
 * Supabase Auth (we never store or hash passwords ourselves).
 */
export async function changePassword(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { status: "error", message: "Password must be at least 8 characters long." };
  }
  if (password !== confirmPassword) {
    return { status: "error", message: "The two passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be logged in." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Password updated." };
}
