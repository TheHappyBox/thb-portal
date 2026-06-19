import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and keeps the session
 * cookies in sync between the browser and the server.
 *
 * This runs from `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).
 * Server Components cannot write cookies, so this is where refreshed tokens are
 * written back to the response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Write cookies onto both the incoming request (so the rest of this
          // request sees the refreshed session) and the outgoing response (so
          // the browser receives them).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // Apply the no-cache headers Supabase asks for so a CDN/proxy never
          // caches a response that carries another user's session cookies.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // IMPORTANT: call getUser() (contacts the auth server, validates the token)
  // before generating a response. Do not insert logic between client creation
  // and this call, or sessions may fail to refresh.
  await supabase.auth.getUser();

  return supabaseResponse;
}
