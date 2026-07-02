"use client";

import type { OrderMode } from "@/types/order";

/**
 * "Recipients count" step: choose a single recipient or multiple recipients.
 * This sets the order's mode. It's an independent step — it works whether it's
 * shown before or after box selection, depending on how the buyer arrived.
 */
export function ModeStep({
  mode,
  onChoose,
}: {
  mode: OrderMode | null;
  onChoose: (mode: OrderMode) => void;
}) {
  const options: { value: OrderMode; title: string; blurb: string }[] = [
    {
      value: "single",
      title: "Single recipient",
      blurb: "Send one box to one person.",
    },
    {
      value: "multiple",
      title: "Multiple recipients",
      blurb: "Send to a group — one or more boxes, in any quantity.",
    },
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-foreground">
          Who is this order for?
        </h2>
        <p className="text-muted-foreground">
          Choose whether you&apos;re sending to one person or a group. You can
          change this later.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Number of recipients"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {options.map((o) => {
          const active = mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChoose(o.value)}
              className={`flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition ${
                active
                  ? "border-primary bg-muted/40 ring-1 ring-primary"
                  : "border-border bg-white hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <span className="text-lg font-semibold text-foreground">
                {o.title}
              </span>
              <span className="text-sm text-muted-foreground">{o.blurb}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
