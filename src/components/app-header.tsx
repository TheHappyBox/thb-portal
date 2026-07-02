"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, RefreshCw, Settings } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavLink {
  href: string;
  label: string;
}

const BASE_NAV: NavLink[] = [
  { href: "/catalog", label: "Catalog" },
  { href: "/orders", label: "Orders" },
  { href: "/settings", label: "Settings" },
];

/**
 * Shared app header: brand logo, primary nav (with active state), a mobile sheet
 * menu, and an account dropdown with sign-out. The platform-admin "Catalog sync"
 * link only appears for admins. Yellow-forward (top accent + active pills), navy
 * text for readability.
 */
export function AppHeader({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const nav = isAdmin
    ? [...BASE_NAV, { href: "/admin/sync", label: "Catalog sync" }]
    : BASE_NAV;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = (email.trim()[0] || "?").toUpperCase();

  return (
    <header className="sticky top-0 z-40">
      {/* Yellow accent strip — the brand throughline. */}
      <div className="h-1 w-full bg-brand-yellow" />
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <BrandLogo />

          {/* Desktop nav */}
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Account dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label="Account menu"
              >
                <Avatar className="size-9 border border-border">
                  <AvatarFallback className="bg-brand-navy text-sm font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                    {email || "Signed in"}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <Settings className="size-4" /> Account settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem render={<Link href="/admin/sync" />}>
                    <RefreshCw className="size-4" /> Catalog sync
                  </DropdownMenuItem>
                )}
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

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger
                className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="font-heading text-brand-pink lowercase">
                    the happy box
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {nav.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        isActive(link.href)
                          ? "bg-secondary text-secondary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <form action={signOut} className="mt-2">
                    <Button type="submit" variant="outline" className="w-full justify-start">
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </form>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
