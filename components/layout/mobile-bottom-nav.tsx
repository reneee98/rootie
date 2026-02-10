"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, House, Inbox, Search, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

/** 5-tab mobile nav: Domov, Hľadám, Pridať, Inbox, Profil. 44px min tap, safe area. */
const navItems: NavItem[] = [
  { href: "/", label: "Domov", icon: House },
  { href: "/wanted", label: "Hľadám", icon: Search },
  { href: "/create", label: "Pridať", icon: CirclePlus },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/me", label: "Profil", icon: UserRound },
];

function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  /* Hide nav during create wizards for full-screen UX */
  if (pathname === "/create" || pathname === "/wanted/create") return null;

  return (
    <nav
      aria-label="Primary"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 gap-0 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
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
