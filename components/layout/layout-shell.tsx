"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

type LayoutShellProps = {
  children: React.ReactNode;
  isAuthenticated?: boolean;
};

const AUTH_PATHS = ["/login", "/signup"];

function isAuthRoute(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p);
}

/**
 * Admin: no app shell. Auth (login, signup): no app shell, minimal layout.
 * All other routes: AppShell with header + bottom nav.
 */
export function LayoutShell({
  children,
  isAuthenticated = false,
}: LayoutShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const onAuthRoute = isAuthRoute(pathname ?? "");

  if (isAdminRoute || onAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AppShell isAuthenticated={isAuthenticated}>{children}</AppShell>
  );
}
