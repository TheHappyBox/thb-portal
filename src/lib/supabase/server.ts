import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Uses the PUBLISHABLE key; the logged-in user's session is carried in
 * cookies and enforced by Row Level Security.
 *
 * `cookies()` is async in Next.js 16, hence the `await`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component the cookie store is read-only and this throws;
          // that's expected and safe to ignore because the proxy (proxy.ts)
          // refreshes the session cookies on every request. In Server Actions
          // and Route Handlers the store is writable and this succeeds.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // No-op: see comment above.
          }
        },
      },
    },
  );
}
