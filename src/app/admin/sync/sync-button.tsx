"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { syncShopifyCatalog, type SyncState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
    >
      {pending ? "Syncing…" : "Sync catalog from Shopify"}
    </button>
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
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      {state?.status === "success" && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
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
      <span className="text-lg font-semibold">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
