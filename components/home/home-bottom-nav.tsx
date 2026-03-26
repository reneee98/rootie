"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  iconSrc,
  active,
  iconClassName = "size-6",
  showBadge = false,
}: {
  href: string;
  label: string;
  iconSrc: string;
  active: boolean;
  iconClassName?: string;
  showBadge?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full flex-col items-center gap-[6px] px-[11px] py-[10px]",
        active ? "text-[#4f5826]" : "text-[#4f5826]/50"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        <Image
          src={iconSrc}
          alt=""
          width={24}
          height={24}
          className={cn(iconClassName, "object-contain", active ? "opacity-100" : "opacity-50")}
        />
        {showBadge ? (
          <span className="absolute -right-[4px] -top-[5px] inline-flex h-[14px] min-w-4 items-center justify-center rounded-[999px] bg-[#fb2c36] px-[5px] text-center text-[9px] leading-[9px] font-bold text-white">
            3
          </span>
        ) : null}
      </span>
      <span className="text-[10px] font-medium leading-[14px]">{label}</span>
    </Link>
  );
}

export function HomeBottomNav({
  isAuthenticated = false,
}: HomeBottomNavProps) {
  const pathname = usePathname();
  const inboxHref = isAuthenticated ? "/inbox" : "/login";
  const profileHref = isAuthenticated ? "/me" : "/login";
  const createHref = isAuthenticated ? "/create" : "/login";
  const homeActive = isActive(pathname, "/");
  const wantedActive = isActive(pathname, "/wanted");
  const inboxActive = isActive(pathname, inboxHref);
  const profileActive = isActive(pathname, profileHref);

  const indicatorLeft = homeActive
    ? "calc(10% - 19.5px)"
    : wantedActive
      ? "calc(30% - 19.5px)"
      : inboxActive
        ? "calc(70% - 19.5px)"
        : profileActive
          ? "calc(90% - 19.5px)"
          : "calc(10% - 19.5px)";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative h-[124px] w-full">
        <Image
          src="/figma-home/nav-3284-shell.svg"
          alt=""
          width={1440}
          height={92}
          className="pointer-events-none absolute left-0 top-8 h-[92px] w-full"
          priority
        />
        <div
          className="pointer-events-none absolute top-8 h-1 w-[39px] rounded-[30px] bg-[#c4c35b] transition-all duration-200"
          style={{ left: indicatorLeft }}
        />

        <div className="absolute inset-x-0 top-[43px] grid grid-cols-5 items-center">
          <NavItem
            href="/"
            label="Domov"
            iconSrc="/figma-home/nav-3284-home.svg"
            active={homeActive}
          />
          <NavItem
            href="/wanted"
            label="Hľadám"
            iconSrc="/figma-home/nav-3284-search.svg"
            active={wantedActive}
          />
          <div />
          <NavItem
            href={inboxHref}
            label="Správy"
            iconSrc="/figma-home/nav-3284-inbox.svg"
            active={inboxActive}
            showBadge={isAuthenticated}
          />
          <NavItem
            href={profileHref}
            label="Profil"
            iconSrc="/figma-home/nav-3297-profile.svg"
            active={profileActive}
            iconClassName="h-[19.5px] w-[15.5px]"
          />
        </div>

        <Link
          href={createHref}
          aria-label="Pridať inzerát"
          className="absolute left-1/2 top-0 inline-flex min-h-[44px] min-w-[44px] size-[76px] -translate-x-1/2 items-center justify-center"
        >
          <Image src="/figma-home/nav-3284-fab-shadow.svg" alt="" fill className="object-contain" />
          <Image
            src="/figma-home/nav-3284-plus.svg"
            alt=""
            width={20}
            height={20}
            className="relative z-10 size-5 -translate-y-[11px]"
          />
        </Link>

      </div>
    </nav>
  );
}
