import type { ReactNode } from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { AppShellHeaderAuth } from "@/components/layout/app-shell-header-auth";

type AppShellProps = {
  children: ReactNode;
  isAuthenticated?: boolean;
};

export function AppShell({ children, isAuthenticated = false }: AppShellProps) {
  return (
    <div className="bg-muted/25 min-h-dvh">
      <div className="bg-background mx-auto flex min-h-dvh w-full max-w-md flex-col border-x shadow-sm">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <Link
              href="/"
              className="text-foreground hover:text-primary inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors"
            >
              <Leaf className="size-4" />
              Rootie
            </Link>
            <AppShellHeaderAuth isAuthenticated={isAuthenticated} />
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
          {children}
        </main>

        <MobileBottomNav isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
