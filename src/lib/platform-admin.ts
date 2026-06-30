import "server-only";

/**
 * STOPGAP platform-admin gate. There's no platform-admin system yet, so internal
 * (THB-only) tools like the Shopify catalog sync are gated by a simple allow-list
 * of email addresses in THB_ADMIN_EMAILS (comma-separated). Kept in ONE place so
 * it's trivial to replace with a real platform-admin layer later.
 *
 * Client/buyer accounts are never on this list, so they can't see or run these.
 */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.THB_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.trim().toLowerCase());
}
