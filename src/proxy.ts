import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 "proxy" (formerly `middleware`). Runs before routes render and
 * refreshes the Supabase auth session on every matched request so logins
 * persist across navigations.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (build assets)
     * - _next/image (image optimization)
     * - favicon.ico and common static image types
     * Without this, the proxy would also run on CSS/JS/image requests.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
