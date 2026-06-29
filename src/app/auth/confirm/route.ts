import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation / OTP / password-recovery callback.
 *
 * This handles two link shapes so it works regardless of how Supabase formats
 * the email:
 *  - `token_hash` + `type` (e.g. recovery, signup) → verifyOtp
 *  - `code` (PKCE) → exchangeCodeForSession
 *
 * Both establish a session, then we forward to `next` (e.g. /reset-password for
 * password resets, /dashboard for email confirmation). Any failure lands on the
 * friendly /auth/error page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
