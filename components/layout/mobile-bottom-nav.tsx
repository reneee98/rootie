"use client";

import type { ComponentType } from "react";
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

  /* Hide nav during create wizards for full-screen UX */
  if (pathname === "/create" || pathname === "/wanted/create") return null;

  const visibleItems = navItems.filter((item) => {
    if (item.authOnly && !isAuthenticated) return false;
    if (item.guestOnly && isAuthenticated) return false;
    return true;
  });

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
                <Icon className="size-5 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
