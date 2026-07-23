import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthPage } from "@/components/auth-page";
import { signIn, signUp } from "../actions";

/**
 * Kept as a real route for existing links. Renders the same single auth screen as
 * /, just starting on sign up; signed-in visitors are sent to their dashboard
 * rather than being shown "Create a company account".
 */
export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <AuthPage initialMode="signup" signInAction={signIn} signUpAction={signUp} />;
}
