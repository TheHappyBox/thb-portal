"use client";

import type { OrderMode, RecipientDraft } from "@/types/order";
import { blankRecipient, recipientIssues } from "@/lib/order-builder";
import { RecipientRow } from "@/components/order-builder/recipient-row";
import { RecipientUpload } from "@/components/order-builder/recipient-upload";
import { Button } from "@/components/ui/button";

/**
 * "Recipients" step. SINGLE mode is one lean form. MULTIPLE mode is a growing,
 * scannable list with counts, add/remove, validation hints, and an Excel/CSV
 * upload that appends rows. Per-recipient messages override the shared message.
 */
export function RecipientsStep({
  mode,
  recipients,
  sharedMessage,
  onChange,
}: {
  mode: OrderMode;
  recipients: RecipientDraft[];
  sharedMessage: string;
  onChange: (recipients: RecipientDraft[]) => void;
}) {
  // ---- single: exactly one recipient ----
  if (mode === "single") {
    const r = recipients[0] ?? blankRecipient();
    return (
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-foreground">Recipient</h2>
          <p className="text-muted-foreground">
            Add their address, or send them a link to add it themselves.
          </p>
        </div>
        <RecipientRow
          recipient={r}
          sharedMessage={sharedMessage}
          onPatch={(patch) => onChange([{ ...r, ...patch }])}
        />
      </section>
    );
  }

  // ---- multiple: list + upload ----
  const patchAt = (i: number, patch: Partial<RecipientDraft>) =>
    onChange(recipients.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeAt = (i: number) => onChange(recipients.filter((_, idx) => idx !== i));
  const add = () => onChange([...recipients, blankRecipient()]);
  const importRows = (rows: RecipientDraft[]) => onChange([...recipients, ...rows]);

  const flagged = recipients.filter((r) => recipientIssues(r).length > 0).length;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-foreground">Recipients</h2>
        <p className="text-muted-foreground">
          Add everyone receiving a gift — manually or by uploading a list.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{recipients.length}</strong> recipient
          {recipients.length === 1 ? "" : "s"}
          {flagged > 0 && <span className="text-amber-700"> · {flagged} need attention</span>}
        </p>
        <Button type="button" variant="outline" onClick={add}>
          + Add recipient
        </Button>
      </div>

      {recipients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
          No recipients yet. Add one manually or upload a list below.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {recipients.map((r, i) => (
            <RecipientRow
              key={i}
              recipient={r}
              index={i + 1}
              sharedMessage={sharedMessage}
              onPatch={(patch) => patchAt(i, patch)}
              onRemove={() => removeAt(i)}
            />
          ))}
        </div>
      )}

      <RecipientUpload onImport={importRows} />
    </section>
  );
}
