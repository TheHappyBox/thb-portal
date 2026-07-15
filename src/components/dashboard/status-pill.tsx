/**
 * The order-status pill used in the dashboard's recent-orders table. It renders
 * the order's REAL status (draft / submitted / processing / completed / paid /
 * cancelled) in the rounded, tinted style from the Figma design — a soft brand
 * wash behind an extra-bold colored label. Unknown statuses fall back to a
 * neutral sand pill rather than being hidden.
 */
const STYLES: Record<string, string> = {
  paid: "bg-brand-teal/20 text-brand-teal",
  completed: "bg-brand-navy/[0.06] text-brand-navy",
  processing: "bg-brand-yellow/20 text-brand-yellow-deep",
  submitted: "bg-brand-yellow/20 text-brand-yellow-deep",
  draft: "bg-brand-sand text-brand-ink-soft",
  cancelled: "bg-destructive/10 text-destructive",
};

export function StatusPill({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-brand-sand text-brand-ink-soft";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}
    >
      {label}
    </span>
  );
}
