"use client";

import Link from "next/link";
import { Heart, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppShellHeaderAuthProps = {
  isAuthenticated: boolean;
};

/**
 * Header right section — shows contextual links for authenticated users,
 * and a compact login button for guests.
 */
export function AppShellHeaderAuth({
  isAuthenticated,
}: AppShellHeaderAuthProps) {
  if (!isAuthenticated) {
    return (
      <Button asChild size="sm" variant="default" className="min-h-[36px] gap-1.5 text-xs">
        <Link href="/login">
          <LogIn className="size-3.5" aria-hidden />
          Prihlásiť sa
        </Link>
      </Button>
    );
  }

  return (
    <Link
      href="/saved"
      className="text-muted-foreground hover:text-foreground flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors hover:text-primary"
      aria-label="Uložené"
    >
      <Heart className="size-5 shrink-0" aria-hidden />
    </Link>
  );
}
