"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CirclePlus,
  House,
  Inbox,
  LogIn,
  Search,
  UserRound,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** If true, only show for authenticated users */
  authOnly?: boolean;
  /** If true, only show for guests */
  guestOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Domov", icon: House },
  { href: "/wanted", label: "Hľadám", icon: Search },
  { href: "/create", label: "Pridať", icon: CirclePlus, authOnly: true },
  { href: "/inbox", label: "Inbox", icon: Inbox, authOnly: true },
  { href: "/me", label: "Profil", icon: UserRound, authOnly: true },
  { href: "/login", label: "Prihlásiť", icon: LogIn, guestOnly: true },
];

function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type MobileBottomNavProps = {
  isAuthenticated?: boolean;
};

export function MobileBottomNav({
  isAuthenticated = false,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const [hasUnreadInbox, setHasUnreadInbox] = useState(false);
  const hideNav = pathname === "/create" || pathname === "/wanted/create";

  const refreshUnreadStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setHasUnreadInbox(false);
      return;
    }

    try {
      const response = await fetch("/api/inbox/unread", {
        cache: "no-store",
      });
      if (!response.ok) {
        setHasUnreadInbox(false);
        return;
      }

      const data = (await response.json()) as { hasUnread?: boolean };
      setHasUnreadInbox(Boolean(data.hasUnread));
    } catch {
      // Keep previous state if request fails.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshUnreadStatus();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [refreshUnreadStatus, pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("bottom-nav-inbox-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          void refreshUnreadStatus();
        }
      )
      .subscribe();

    return () => {
      const channelToRemove = channel;
      setTimeout(() => {
        supabase.removeChannel(channelToRemove);
      }, 0);
    };
  }, [isAuthenticated, refreshUnreadStatus]);

  const visibleItems = navItems.filter((item) => {
    if (item.authOnly && !isAuthenticated) return false;
    if (item.guestOnly && isAuthenticated) return false;
    return true;
  });

  /* Hide nav during create wizards for full-screen UX */
  if (hideNav) return null;

  return (
    <nav
      aria-label="Primary"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur"
    >
      <ul
        className="mx-auto grid max-w-md gap-0 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        style={{ gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)` }}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(pathname, item.href);
          const showInboxUnreadDot = item.href === "/inbox" && hasUnreadInbox;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground hover:bg-accent inline-flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] font-medium transition-colors touch-manipulation",
                  active && "bg-accent text-primary"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative inline-flex">
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {showInboxUnreadDot ? (
                    <>
                      <span
                        className="absolute -top-0.5 -right-1.5 inline-flex size-2 rounded-full bg-red-500 ring-2 ring-background"
                        aria-hidden
                      />
                      <span className="sr-only">Máte nové správy</span>
                    </>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
