"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Shape returned to the auth forms when something goes wrong. On success these
 * actions redirect instead of returning, so the forms only ever receive errors.
 */
export type AuthFormState = { error: string } | undefined;

/**
 * Sign up = create a NEW company. The signer becomes that company's admin.
 * The company name and full name are passed as auth metadata; a database
 * trigger (handle_new_user) reads them to create the account + admin user row.
 */
export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !email || !password) {
    return { error: "Company name, email, and password are all required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      data: {
        company_name: companyName,
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmation OFF, signUp also signs the user in. If it is later
  // turned ON, there will be no session yet and the dashboard will bounce the
  // user to /login until they confirm — which is the desired behavior.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Log in an existing user with email + password. */
export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Log the current user out and return them to the login page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
