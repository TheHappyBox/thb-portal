import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ClaimForm } from "@/app/claim/[token]/claim-form";

export const metadata: Metadata = {
  title: "Your gift · The Happy Box",
  description: "Add your shipping address to receive your gift.",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The whitelisted shape returned by claim_get_recipient (nothing else leaks). */
interface ClaimView {
  full_name: string | null;
  claim_status: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  company_name: string;
  gift_name: string;
}

/**
 * PUBLIC recipient claim page (no auth). Access is solely by knowing the token.
 * The page reads ONE recipient via the SECURITY DEFINER `claim_get_recipient`
 * function (the recipients table stays closed to the anon role), so it can only
 * ever show this one recipient's own gift + address — never any other order or
 * account data. An unknown / malformed token shows a friendly invalid-link page.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    return <InvalidLink />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("claim_get_recipient", { p_token: token })
    .maybeSingle<ClaimView>();

  if (error || !data) {
    return <InvalidLink />;
  }

  const claim = data;

  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:py-16">
        <div className="flex flex-col gap-2 text-center">
          <span className="text-sm font-medium uppercase tracking-wide text-brand-gold">
            The Happy Box
          </span>
          <h1 className="text-3xl font-semibold text-brand-ink">
            {claim.company_name} sent you a gift!
          </h1>
          <p className="text-brand-muted">
            You&apos;re receiving <strong className="text-brand-ink">{claim.gift_name}</strong>.
          </p>
        </div>

        {claim.claim_status === "fulfilled" ? (
          <div className="rounded-xl border border-brand-sand bg-white p-6 text-center">
            <p className="text-lg font-semibold text-brand-ink">
              Your gift is on its way! 🎁
            </p>
            <p className="mt-1 text-sm text-brand-muted">
              This gift has shipped, so the address can no longer be changed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-brand-sand bg-white p-6">
            <p className="text-sm text-brand-muted">
              Tell us where to send it. You can come back to this link to update your
              details any time before it ships.
            </p>
            <ClaimForm
              token={token}
              initial={{
                fullName: claim.full_name ?? "",
                addressLine1: claim.address_line1 ?? "",
                addressLine2: claim.address_line2 ?? "",
                city: claim.city ?? "",
                region: claim.region ?? "",
                postalCode: claim.postal_code ?? "",
                country: claim.country ?? "",
              }}
            />
          </div>
        )}

        <p className="text-center text-xs text-brand-muted">
          Curated gift boxes by The Happy Box.
        </p>
      </div>
    </main>
  );
}

/** Friendly fallback that leaks no internal detail. */
function InvalidLink() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
        <span className="text-sm font-medium uppercase tracking-wide text-brand-gold">
          The Happy Box
        </span>
        <h1 className="text-2xl font-semibold text-brand-ink">
          This link isn&apos;t valid
        </h1>
        <p className="text-brand-muted">
          This gift link is invalid or has expired. If someone sent you a gift, please
          double-check the link, or ask them to share it again.
        </p>
      </div>
    </main>
  );
}
