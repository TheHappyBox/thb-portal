import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged, SERVER-ONLY Supabase client using the SECRET key.
 *
 * The secret key bypasses Row Level Security, so this MUST never be imported
 * into client code — the `server-only` import above makes such a mistake fail
 * the build.
 *
 * NOTE: This is a deliberate seam for future privileged operations (e.g. the
 * public recipient self-claim flow, admin catalog management). It is NOT used by
 * the current signup/login/dashboard flows — those rely on the publishable key +
 * RLS, and account provisioning is handled by a database trigger.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
