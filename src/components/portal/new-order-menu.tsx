"use client";

import Link from "next/link";
import { User, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The single-vs-bulk fork, presented wherever an order can be started (top bar,
 * catalog card, box popup). The chosen send type travels to the builder as
 * `?mode=`, so the builder never has to ask. When a box is supplied it travels
 * too, so the box AND the mode arrive together.
 */
export function NewOrderMenu({
  children,
  triggerClassName,
  triggerLabel = "Start an order",
  boxHandle,
  variantId,
  align = "end",
}: {
  children: React.ReactNode;
  triggerClassName?: string;
  /** Accessible name for the trigger, since its content may be decorative. */
  triggerLabel?: string;
  boxHandle?: string | null;
  variantId?: string | null;
  align?: "start" | "center" | "end";
}) {
  const hrefFor = (mode: "single" | "multiple") => {
    const params = new URLSearchParams({ mode });
    if (boxHandle) {
      params.set("box", boxHandle);
      if (variantId) params.set("variant", variantId);
    }
    return `/orders/new?${params.toString()}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={triggerLabel} className={triggerClassName}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuItem render={<Link href={hrefFor("single")} />}>
          <User className="size-4" />
          <span className="flex flex-col">
            <span className="font-semibold text-foreground">Send to one person</span>
            <span className="text-xs text-muted-foreground">One box, one recipient</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={hrefFor("multiple")} />}>
          <Users className="size-4" />
          <span className="flex flex-col">
            <span className="font-semibold text-foreground">Send to many</span>
            <span className="text-xs text-muted-foreground">Boxes for a group</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
