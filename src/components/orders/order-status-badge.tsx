/**
 * Small status pill for an order. Paid is the warm berry accent; draft is a muted
 * sand tone; anything else falls back to a neutral label.
 */
export function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-brand-berry/10 text-brand-berry",
    draft: "bg-brand-sand text-brand-muted",
  };
  const className = styles[status] ?? "bg-brand-sand text-brand-muted";
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
