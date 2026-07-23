"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The account avatar + dropdown (settings, sign out) used in the redesigned
 * portal chrome — shared by the topbar (dashboard/catalog) and the order
 * builder's header so there's a single account control.
 */
export function AccountMenu({
  initials,
  userName,
  companyName,
  email,
}: {
  initials: string;
  userName: string;
  companyName: string;
  email: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-10 flex-none items-center justify-center rounded-full bg-[#459682] text-[13px] font-bold text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* GroupLabel must live inside a Group — without it the popup fails to
            render at all (the trigger opens but nothing mounts). */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate font-semibold text-foreground">
              {userName || "Your account"}
            </span>
            <span className="block truncate text-muted-foreground">{companyName || email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" /> Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none hover:bg-muted"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
