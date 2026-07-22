import { redirect } from "next/navigation";

/**
 * The box detail view is now a popup on the catalog (see BoxDetailModal). This
 * route is kept so existing/deep links to /catalog/<handle> still work: it sends
 * the shopper to the catalog with that box's popup opened via ?box=<handle>.
 * (The catalog page gates auth, so unauthenticated visitors still reach /login.)
 */
export default async function ProductDetailPage({
  params,
}: {
  // Next 16: params is a Promise and must be awaited.
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  redirect(`/catalog?box=${encodeURIComponent(handle)}`);
}
