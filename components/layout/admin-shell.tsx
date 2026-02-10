import Link from "next/link";
import { Shield, ArrowLeft, Flag } from "lucide-react";

type AdminShellProps = {
  children: React.ReactNode;
};

/**
 * Dedicated shell for /admin: own header and nav. No main app header or bottom nav.
 */
export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="bg-muted/25 min-h-dvh">
      <div className="bg-background mx-auto flex min-h-dvh w-full max-w-md flex-col border-x shadow-sm">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-muted-foreground" aria-hidden />
              <span className="font-semibold text-foreground">Administrácia</span>
            </div>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Späť do aplikácie
            </Link>
          </div>
          <nav
            className="flex gap-1 border-t px-4 py-2"
            aria-label="Administrácia"
          >
            <Link
              href="/admin/reports"
              className="bg-primary text-primary-foreground inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium"
            >
              <Flag className="size-4" aria-hidden />
              Nahlásenia
            </Link>
          </nav>
        </header>

        <main className="flex-1 px-4 pt-4 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
