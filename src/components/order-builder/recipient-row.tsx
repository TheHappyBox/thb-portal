"use client";

import type { RecipientDraft } from "@/types/order";
import { recipientIssues } from "@/lib/order-builder";
import { AddressFields } from "@/components/order-builder/address-fields";

const inputClass =
  "rounded-md border border-brand-sand bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-berry";

/**
 * One recipient's editable details — name, optional email, the address-vs-
 * self-claim choice, and an optional per-recipient message that overrides the
 * order's shared message. Used both for the single-mode lean form (no index
 * label / remove) and as a card in the bulk list.
 */
export function RecipientRow({
  recipient,
  index,
  sharedMessage,
  onPatch,
  onRemove,
}: {
  recipient: RecipientDraft;
  /** 1-based position in the bulk list; omit for the single-mode form. */
  index?: number;
  sharedMessage: string;
  onPatch: (patch: Partial<RecipientDraft>) => void;
  onRemove?: () => void;
}) {
  const issues = recipientIssues(recipient);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-ink">
          {index ? `Recipient ${index}` : "Recipient"}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-brand-muted underline transition hover:text-brand-berry"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="Full name"
          autoComplete="name"
          value={recipient.fullName}
          onChange={(e) => onPatch({ fullName: e.target.value })}
        />
        <input
          className={inputClass}
          type="email"
          placeholder="Email (optional)"
          autoComplete="email"
          value={recipient.email}
          onChange={(e) => onPatch({ email: e.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-brand-ink">
        <input
          type="checkbox"
          checked={recipient.selfClaim}
          onChange={(e) => onPatch({ selfClaim: e.target.checked })}
          className="h-4 w-4 accent-brand-berry"
        />
        Send them a link to add their own address
      </label>

      {!recipient.selfClaim && (
        <AddressFields recipient={recipient} onPatch={onPatch} />
      )}

      <textarea
        className={inputClass}
        rows={2}
        placeholder={
          sharedMessage
            ? `Personal message (optional — defaults to: “${sharedMessage}”)`
            : "Personal message (optional)"
        }
        value={recipient.message}
        onChange={(e) => onPatch({ message: e.target.value })}
      />

      {issues.length > 0 && (
        <ul className="flex flex-col gap-1">
          {issues.map((issue) => (
            <li key={issue} className="text-xs text-amber-700">
              ⚠ {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
