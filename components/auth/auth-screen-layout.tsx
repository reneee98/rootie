"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthScreenLayoutProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Minimal full-screen layout for auth (welcome, login, signup).
 * Safe area, max-width, lots of whitespace. No app shell.
 */
export function AuthScreenLayout({ children, className }: AuthScreenLayoutProps) {
  return (
    <div
      className={cn(
        "bg-background flex min-h-dvh flex-col",
        "px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        className
      )}
    >
      <div className="mx-auto w-full max-w-sm flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
