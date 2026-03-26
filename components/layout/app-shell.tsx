import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

type AppShellProps = {
  children: ReactNode;
  isAuthenticated?: boolean;
};

export function AppShell({
  children,
  isAuthenticated = false,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[#f2ede2]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f2ede2] shadow-sm">
        <header className="sticky top-0 z-40 bg-[#f2ede2]/95 backdrop-blur">
          <div className="flex flex-col gap-[10px] px-[14px] py-[10px]">
            <div className="flex justify-center py-[2px]">
              <Link href="/" aria-label="Rootie domov">
                <Image
                  src="/figma-header/rootie-logo.svg"
                  alt="Rootie"
                  width={104}
                  height={32}
                  priority
                  className="h-[31px] w-[104px]"
                />
              </Link>
            </div>

            <div className="flex items-center gap-[10px]">
              <Link
                href="/search"
                className="flex h-[44px] flex-1 items-center gap-[6px] rounded-[18px] border-2 border-[#c4c35b]/20 bg-[#faf8f4] px-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
                aria-label="Hľadať rastliny"
              >
                <Image
                  src="/figma-header/search-icon.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="size-[18px]"
                />
                <span className="text-[14px] text-[#878379]">Hľadať rastliny...</span>
              </Link>

              <Link
                href="/search"
                className="flex size-[44px] items-center justify-center rounded-[18px] bg-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
                aria-label="Otvoriť filtre"
              >
                <Image
                  src="/figma-header/filter-icon.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="size-[17.5px]"
                />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
          {children}
        </main>

        <MobileBottomNav isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
