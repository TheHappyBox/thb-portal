"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { Button } from "@/components/ui/button";

/**
 * Review-step "Continue to checkout" button. Asks the server to create a Stripe
 * hosted Checkout Session for the current draft order, then sends the buyer to
 * Stripe's own secure page. The amount is computed server-side — this button
 * never sends a total. Errors are surfaced inline, never swallowed.
 */
export function CheckoutButton({ orderId }: { orderId: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!orderId) {
      setError("Please finish the earlier steps before checking out.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await startCheckout(orderId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Hand off to Stripe's hosted checkout page.
      window.location.href = res.url;
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        onClick={onClick}
        disabled={pending || !orderId}
      >
        {pending ? "Starting secure checkout…" : "Continue to checkout →"}
      </Button>
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          You&apos;ll be taken to Stripe&apos;s secure checkout to pay. Card details never
          touch The Happy Box.
        </p>
      )}
    </div>
  );
}
