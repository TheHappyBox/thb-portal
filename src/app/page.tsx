import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthPage } from "@/components/auth-page";
import { signIn, signUp } from "@/app/(auth)/actions";

/**
 * The front door. Signed-in visitors go straight to their dashboard — they should
 * never be shown "Create a company account". Everyone else gets the single auth
 * screen, starting on sign in (the common case), with sign up one click away in
 * place.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <AuthPage initialMode="signin" signInAction={signIn} signUpAction={signUp} />
    </main>
  );
}
