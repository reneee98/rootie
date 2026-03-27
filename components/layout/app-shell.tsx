"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { HomeBottomNav } from "@/components/home/home-bottom-nav";
import { HomeFiltersDrawer } from "@/components/feed/home-filters-drawer";
import { searchPlantTaxa } from "@/lib/actions/plant-search";

type AppShellProps = {
  children: ReactNode;
  isAuthenticated?: boolean;
};

const TOP_POPULAR_SUGGESTIONS = [
  "Monstera deliciosa",
  "Monstera adansonii",
  "Philodendron pink princess",
  "Hoya carnosa",
  "Alocasia Frydek",
] as const;

export function AppShell({
  children,
  isAuthenticated = false,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFullSearchRoute = pathname === "/search";
  const isListingDetailRoute = /^\/listing\/[^/]+$/.test(pathname ?? "");
  const showHeader = !isListingDetailRoute;
  const showBottomNav = !isListingDetailRoute;
  const searchAction = "/search";
  const searchValue = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(searchValue);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = query.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      searchPlantTaxa(term)
        .then((items) => {
          setSearchResults(items.map((item) => item.canonical_name));
        })
        .finally(() => setSearchLoading(false));
    }, 260);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const submitSearch = (value: string) => {
    const term = value.trim();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (term) params.set("q", term);
    else params.delete("q");
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search", { scroll: false });
    setSearchOpen(false);
  };

  const visibleSuggestions =
    query.trim().length >= 2
      ? searchResults
      : TOP_POPULAR_SUGGESTIONS.filter((item) =>
          item.toLowerCase().includes(query.trim().toLowerCase())
        );
  const showSuggestions =
    isFullSearchRoute && searchOpen && (query.trim().length > 0 || visibleSuggestions.length > 0);

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-transparent shadow-sm">
        {showHeader ? (
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

              <div className="flex items-start gap-[10px]">
                <div ref={searchContainerRef} className="relative flex-1">
                  <form
                    action={searchAction}
                    className="flex"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitSearch(query);
                    }}
                  >
                    <label className="flex h-[44px] w-full items-center gap-[6px] rounded-[18px] border-2 border-[#c4c35b]/20 bg-[#faf8f4] px-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                      <Image
                        src="/figma-header/search-icon.svg"
                        alt=""
                        width={18}
                        height={18}
                        className="size-[18px]"
                      />
                      <input
                        type="search"
                        name="q"
                        value={query}
                        readOnly={!isFullSearchRoute}
                        onFocus={() => {
                          if (!isFullSearchRoute) {
                            submitSearch(query);
                            return;
                          }
                          setSearchOpen(true);
                        }}
                        onChange={(event) => {
                          if (!isFullSearchRoute) return;
                          setQuery(event.target.value);
                          setSearchOpen(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setSearchOpen(false);
                          }
                        }}
                        placeholder="Hľadať rastliny..."
                        className="w-full bg-transparent text-[14px] leading-normal text-[#878379] outline-none placeholder:text-[#878379]"
                        aria-label="Hľadať rastliny"
                      />
                    </label>
                  </form>

                  {showSuggestions ? (
                    <div className="absolute inset-x-0 top-[49px] z-50 overflow-hidden rounded-[14px] border border-[#e9e2d1] bg-[#faf8f4] shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                      {searchLoading ? (
                        <p className="px-3 py-2 text-[12px] text-[#67635c]">Hľadám návrhy…</p>
                      ) : visibleSuggestions.length > 0 ? (
                        <ul className="max-h-[240px] overflow-y-auto py-1">
                          {visibleSuggestions.map((name) => (
                            <li key={name}>
                              <button
                                type="button"
                                className="flex w-full items-center px-3 py-2 text-left text-[13px] text-[#232711] hover:bg-[#f1ece1]"
                                onClick={() => {
                                  setQuery(name);
                                  submitSearch(name);
                                }}
                              >
                                {name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-3 py-2 text-[12px] text-[#67635c]">Žiadne návrhy</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <HomeFiltersDrawer iconSrc="/figma-header/filter-icon.svg" />
              </div>
            </div>
          </header>
        ) : null}

        <main
          className={
            isListingDetailRoute
              ? "flex-1 pb-0"
              : "flex-1 px-4 pt-3 pb-[calc(5.6rem+env(safe-area-inset-bottom))]"
          }
        >
          {children}
        </main>

        {showBottomNav ? <HomeBottomNav isAuthenticated={isAuthenticated} /> : null}
      </div>
    </div>
  );
}
