import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The small bit of shared "chrome" data the redesigned portal shell needs on
 * every page — the signed-in user's name/company/initials for the topbar avatar,
 * and the draft-order count for the sidebar's Orders badge. All account-scoped by
 * RLS. Callers gate auth themselves; this is defensive if no user is present.
 */
export interface PortalChrome {
  userName: string;
  companyName: string;
  email: string;
  initials: string;
  draftBadge: number;
}

export async function loadPortalChrome(): Promise<PortalChrome> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  let userName = "";
  let companyName = "";
  let draftBadge = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, account_id")
      .eq("id", user.id)
      .maybeSingle();
    userName = profile?.full_name ?? "";

    if (profile?.account_id) {
      const { data: account } = await supabase
        .from("accounts")
        .select("name")
        .eq("id", profile.account_id)
        .maybeSingle();
      companyName = account?.name ?? "";
    }

    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");
    draftBadge = count ?? 0;
  }

  const initials =
    (userName || companyName || email || "?")
      .split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return { userName, companyName, email, initials, draftBadge };
}
