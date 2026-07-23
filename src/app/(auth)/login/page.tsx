import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthPage } from "@/components/auth-page";
import { signIn, signUp } from "../actions";

/**
 * Kept as a real route: gated pages redirect here, and links exist in the wild.
 * It renders the same single auth screen as /, just starting on sign in.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <AuthPage initialMode="signin" signInAction={signIn} signUpAction={signUp} />;
}
