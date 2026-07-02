import { Badge } from "@/components/ui/badge";

/**
 * Small status pill for an order. Paid is the warm berry accent; draft is a muted
 * sand tone; anything else falls back to a neutral label.
 */
export function OrderStatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid" ? "default" : status === "draft" ? "secondary" : "outline";
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return <Badge variant={variant}>{label}</Badge>;
}
