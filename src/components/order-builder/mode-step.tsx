"use client";

import { User, Users, type LucideIcon } from "lucide-react";
import type { OrderMode } from "@/types/order";

/**
 * Step 1 — "Type": choose a single recipient or multiple recipients. This sets
 * the order's mode. Selecting a card highlights it; the footer's Continue button
 * advances. It's an independent step — it works whether shown before or after
 * box selection, depending on how the buyer arrived.
 */
export function ModeStep({
  mode,
  onChoose,
}: {
  mode: OrderMode | null;
  onChoose: (mode: OrderMode) => void;
}) {
  const options: {
    value: OrderMode;
    title: string;
    blurb: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
  }[] = [
    {
      value: "single",
      title: "Single recipient",
      blurb: "Send one box to one person",
      icon: User,
      iconBg: "bg-brand-yellow",
      iconColor: "text-brand-navy",
    },
    {
      value: "multiple",
      title: "Multiple recipients",
      blurb: "Send to a group — one or more boxes, any quantity",
      icon: Users,
      iconBg: "bg-[#0f766e]",
      iconColor: "text-white",
    },
  ];

  return (
    <section className="flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-[32px] font-extrabold text-brand-navy">Who is this order for?</h2>
        <p className="text-[16px] text-[#6b7280]">You can change this later.</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Number of recipients"
        className="flex flex-col gap-6 sm:flex-row"
      >
        {options.map((o) => {
          const Icon = o.icon;
          const active = mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChoose(o.value)}
              className={`flex h-[220px] flex-1 flex-col items-center justify-center gap-3 rounded-[10px] border-2 p-12 text-center transition ${
                active
                  ? "border-brand-yellow bg-[#fff8e6]"
                  : "border-[#e8e8e8] bg-white hover:border-brand-yellow/50"
              }`}
            >
              <span
                className={`flex size-12 items-center justify-center rounded-[14px] ${o.iconBg}`}
              >
                <Icon className={`size-7 ${o.iconColor}`} />
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="text-[20px] font-extrabold text-brand-navy">{o.title}</span>
                <span className="text-[14px] leading-[1.5] text-[#6b7280]">{o.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
