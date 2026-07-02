"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { syncShopifyCatalog, type SyncState } from "./actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? "Syncing…" : "Sync catalog from Shopify"}
    </Button>
  );
}

export function SyncButton() {
  const [state, action] = useActionState<SyncState, FormData>(syncShopifyCatalog, undefined);

  return (
    <div className="flex flex-col gap-4">
      <form action={action}>
        <SubmitButton />
      </form>

      {state?.status === "error" && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state?.status === "success" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {state.message}
          </p>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <Stat label="Synced" value={state.summary.total_synced} />
            <Stat label="Added" value={state.summary.added} />
            <Stat label="Updated" value={state.summary.updated} />
            <Stat label="Hidden" value={state.summary.hidden_products} />
            <Stat label="Variants retired" value={state.summary.hidden_variants} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
