import { formatPrice } from "@/lib/pricing";

/**
 * Always-visible running total, shown on the gift-options, recipients, and review
 * steps so the buyer can see the order add up as they go.
 */
export function OrderTotalBar({
  totalCents,
  currency = "CAD",
  note,
}: {
  totalCents: number;
  currency?: string;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-sand bg-white px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-muted">
          Order total
        </span>
        {note && <span className="text-xs text-brand-muted">{note}</span>}
      </div>
      <span className="text-xl font-semibold text-brand-ink">
        {formatPrice(totalCents, currency)}
      </span>
    </div>
  );
}
