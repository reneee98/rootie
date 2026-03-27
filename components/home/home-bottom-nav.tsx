"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Plus, Search, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type HomeBottomNavProps = {
  isAuthenticated?: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-[62px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-center",
        active ? "text-[#4f5826]" : "text-[#7d816d]"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="inline-flex h-[30px] w-[30px] items-center justify-center">
        <span
          className={cn(
            "inline-flex size-[30px] items-center justify-center rounded-full transition-colors",
            active ? "bg-[#ece9de]" : "bg-transparent"
          )}
        >
          <Icon className="size-[17px]" aria-hidden />
        </span>
      </span>
      <span className="text-[10px] font-medium leading-[12px]">{label}</span>
    </Link>
  );
}

export function HomeBottomNav({ isAuthenticated = false }: HomeBottomNavProps) {
  const pathname = usePathname();
  const inboxHref = isAuthenticated ? "/inbox" : "/login";
  const profileHref = isAuthenticated ? "/me" : "/login";
  const createHref = isAuthenticated ? "/create" : "/login";

  const homeActive = isActive(pathname, "/");
  const wantedActive = isActive(pathname, "/wanted");
  const createActive = isActive(pathname, "/create");
  const inboxActive = isActive(pathname, "/inbox");
  const profileActive = isActive(pathname, "/me");

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md px-3">
        <div className="rounded-[20px] border border-[#e4dfd2] bg-[#faf8f4]/95 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur">
          <div className="grid grid-cols-5 items-center px-1 py-1.5">
            <NavItem href="/" label="Domov" active={homeActive} icon={Home} />
            <NavItem href="/wanted" label="Hľadám" active={wantedActive} icon={Search} />

            <Link
              href={createHref}
              className={cn(
                "flex h-[62px] items-center justify-center px-1 py-1.5",
                createActive ? "text-[#4f5826]" : "text-[#7d816d]"
              )}
              aria-current={createActive ? "page" : undefined}
              aria-label="Pridať inzerát"
            >
              <span
                className={cn(
                  "inline-flex h-[44px] w-[44px] items-center justify-center rounded-full shadow-[0_6px_14px_rgba(79,88,38,0.35)]",
                  createActive ? "bg-[#3f491f]" : "bg-[#4f5826]"
                )}
              >
                <Plus className="size-[20px] text-[#f3f0e7]" aria-hidden />
              </span>
              <span className="sr-only">Pridať</span>
            </Link>

            <NavItem href={inboxHref} label="Správy" active={inboxActive} icon={MessageCircle} />
            <NavItem href={profileHref} label="Profil" active={profileActive} icon={User} />
          </div>
        </div>
      </div>
    </nav>
  );
}
