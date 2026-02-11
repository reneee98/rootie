"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

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
  const pathname = usePathname();
  const [savedCount, setSavedCount] = useState(0);

  const refreshSavedCount = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedCount(0);
      return;
    }

    try {
      const response = await fetch("/api/saved/count", {
        cache: "no-store",
      });
      if (!response.ok) {
        setSavedCount(0);
        return;
      }

      const data = (await response.json()) as { count?: number };
      const nextCount = typeof data.count === "number" ? data.count : 0;
      setSavedCount(nextCount);
    } catch {
      // Keep previous state when request fails.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setTimeout(() => {
      void refreshSavedCount();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [isAuthenticated, pathname, refreshSavedCount]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onSavedChanged = () => {
      void refreshSavedCount();
    };

    window.addEventListener("rootie:saved-changed", onSavedChanged);
    return () => {
      window.removeEventListener("rootie:saved-changed", onSavedChanged);
    };
  }, [isAuthenticated, refreshSavedCount]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("header-saved-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_listings",
        },
        () => {
          void refreshSavedCount();
        }
      )
      .subscribe();

    return () => {
      const channelToRemove = channel;
      setTimeout(() => {
        supabase.removeChannel(channelToRemove);
      }, 0);
    };
  }, [isAuthenticated, refreshSavedCount]);

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
      className="text-muted-foreground hover:text-foreground relative flex min-h-[44px] min-w-[44px] items-center justify-center transition-colors hover:text-primary"
      aria-label="Uložené"
    >
      <Heart className="size-5 shrink-0" aria-hidden />
      {savedCount > 0 ? (
        <>
          <span
            className="absolute top-1 right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
            aria-hidden
          >
            {savedCount > 99 ? "99+" : savedCount}
          </span>
          <span className="sr-only">Uložené inzeráty: {savedCount}</span>
        </>
      ) : null}
    </Link>
  );
}
