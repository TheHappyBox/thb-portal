import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AppHeader } from "@/components/app-header";

/**
 * The one shared shell for authenticated pages: brand header + nav + a consistent
 * page container and page-header (title + optional actions). Pages keep their own
 * auth gate + inner content; this only provides the frame. Reads the user for the
 * nav (account + admin link); it does not gate.
 */
export async function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-col bg-background">
      <AppHeader email={user?.email ?? ""} isAdmin={isPlatformAdmin(user?.email)} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              {title && (
                <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
              )}
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
