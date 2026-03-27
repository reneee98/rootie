"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { SLOVAK_REGIONS } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

type FeedType = "all" | "fixed" | "auction";
type FeedCategory = "" | "plant" | "accessory";
type FeedSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "trending"
  | "ending_soon"
  | "auction_newest";

const TYPE_OPTIONS: { value: FeedType; label: string }[] = [
  { value: "all", label: "Všetko" },
  { value: "fixed", label: "Predaj" },
  { value: "auction", label: "Aukcie" },
];

const CATEGORY_OPTIONS: { value: FeedCategory; label: string }[] = [
  { value: "", label: "Všetko" },
  { value: "plant", label: "Rastliny" },
  { value: "accessory", label: "Príslušenstvo" },
];

function defaultSort(type: FeedType): FeedSort {
  return type === "auction" ? "ending_soon" : "newest";
}

function parseType(value: string | null): FeedType {
  if (value === "fixed" || value === "auction") return value;
  return "all";
}

function parseSort(value: string | null, type: FeedType): FeedSort {
  if (type === "auction") {
    return value === "auction_newest" || value === "ending_soon"
      ? value
      : "ending_soon";
  }
  return value === "newest" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "trending"
    ? value
    : "newest";
}

function parseCategory(value: string | null): FeedCategory {
  if (value === "plant" || value === "accessory") return value;
  return "";
}

type HomeFiltersDrawerProps = {
  iconSrc?: string;
  buttonClassName?: string;
};

export function HomeFiltersDrawer({
  iconSrc = "/figma-home/filter.svg",
  buttonClassName,
}: HomeFiltersDrawerProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentType = parseType(searchParams.get("type"));
  const currentSort = parseSort(searchParams.get("sort"), currentType);
  const currentRegion = searchParams.get("region") ?? "";
  const currentCategory = parseCategory(searchParams.get("category"));
  const currentSwap = searchParams.get("swap") === "1";
  const currentVerified = searchParams.get("verified") === "1";

  const [draftType, setDraftType] = useState<FeedType>(currentType);
  const [draftSort, setDraftSort] = useState<FeedSort>(currentSort);
  const [draftRegion, setDraftRegion] = useState(currentRegion);
  const [draftCategory, setDraftCategory] = useState<FeedCategory>(currentCategory);
  const [draftSwap, setDraftSwap] = useState(currentSwap);
  const [draftVerified, setDraftVerified] = useState(currentVerified);

  const sortOptions = useMemo(() => {
    if (draftType === "auction") {
      return [
        { value: "ending_soon", label: "Končí čoskoro" },
        { value: "auction_newest", label: "Najnovšie aukcie" },
      ] as const;
    }
    return [
      { value: "newest", label: "Najnovšie" },
      { value: "trending", label: "Trending" },
      { value: "price_asc", label: "Cena: od najnižšej" },
      { value: "price_desc", label: "Cena: od najvyššej" },
    ] as const;
  }, [draftType]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (currentType !== "all") count += 1;
    if (currentSort !== defaultSort(currentType)) count += 1;
    if (currentRegion) count += 1;
    if (currentCategory) count += 1;
    if (currentSwap) count += 1;
    if (currentVerified) count += 1;
    return count;
  }, [currentCategory, currentRegion, currentSort, currentSwap, currentType, currentVerified]);

  const openDrawer = useCallback(() => {
    const type = parseType(searchParams.get("type"));
    setDraftType(type);
    setDraftSort(parseSort(searchParams.get("sort"), type));
    setDraftRegion(searchParams.get("region") ?? "");
    setDraftCategory(parseCategory(searchParams.get("category")));
    setDraftSwap(searchParams.get("swap") === "1");
    setDraftVerified(searchParams.get("verified") === "1");
    setOpen(true);
  }, [searchParams]);

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (draftType === "all") params.delete("type");
    else params.set("type", draftType);

    const normalizedSort = parseSort(draftSort, draftType);
    if (normalizedSort === defaultSort(draftType)) params.delete("sort");
    else params.set("sort", normalizedSort);

    if (draftRegion) params.set("region", draftRegion);
    else params.delete("region");

    if (draftCategory) params.set("category", draftCategory);
    else params.delete("category");

    if (draftSwap) params.set("swap", "1");
    else params.delete("swap");

    if (draftVerified) params.set("verified", "1");
    else params.delete("verified");

    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
    setOpen(false);
  }, [
    draftCategory,
    draftRegion,
    draftSort,
    draftSwap,
    draftType,
    draftVerified,
    router,
    searchParams,
  ]);

  const clearAll = useCallback(() => {
    setDraftType("all");
    setDraftSort("newest");
    setDraftRegion("");
    setDraftCategory("");
    setDraftSwap(false);
    setDraftVerified(false);

    const params = new URLSearchParams(searchParams.toString());
    ["type", "sort", "region", "category", "swap", "verified", "page"].forEach((k) =>
      params.delete(k)
    );
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
    setOpen(false);
  }, [router, searchParams]);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className={cn(
          "relative flex size-[44px] items-center justify-center rounded-[18px] bg-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.1)]",
          buttonClassName
        )}
        aria-label="Filtre"
      >
        <Image src={iconSrc} alt="" width={18} height={18} className="size-[17.5px]" />
        {activeCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fb2c36] px-1 text-[9px] font-bold leading-none text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader className="pb-1 text-left">
            <DrawerTitle>Filtre</DrawerTitle>
            <DrawerDescription className="text-xs">Nastav si feed podľa seba.</DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[62vh] space-y-5 overflow-y-auto px-4 pb-4">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Typ ponuky</h3>
              <SegmentedControl
                ariaLabel="Typ ponuky"
                value={draftType}
                onValueChange={(nextType) => {
                  setDraftType(nextType);
                  setDraftSort(defaultSort(nextType));
                }}
                options={TYPE_OPTIONS}
                className="border-[#ded7c6] bg-[#f8f4ec] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] [&_button[aria-selected='false']]:text-[#656057] [&_button[aria-selected='false']]:hover:text-[#232711]"
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Triedenie</h3>
              <div className="relative">
                <select
                  value={draftSort}
                  onChange={(event) => setDraftSort(event.target.value as FeedSort)}
                  className="h-11 min-h-[44px] w-full appearance-none rounded-xl border border-[#ded7c6] bg-[#f8f4ec] px-3 pr-12 text-sm text-[#232711] outline-none focus-visible:ring-2 focus-visible:ring-[#4f5826]/35"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#232711]/80" />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Kategória</h3>
              <SegmentedControl
                ariaLabel="Kategória"
                value={draftCategory}
                onValueChange={setDraftCategory}
                options={CATEGORY_OPTIONS}
                className="border-[#ded7c6] bg-[#f8f4ec] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] [&_button[aria-selected='false']]:text-[#656057] [&_button[aria-selected='false']]:hover:text-[#232711]"
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Kraj</h3>
              <div className="relative">
                <select
                  value={draftRegion}
                  onChange={(event) => setDraftRegion(event.target.value)}
                  className="h-11 min-h-[44px] w-full appearance-none rounded-xl border border-[#ded7c6] bg-[#f8f4ec] px-3 pr-12 text-sm text-[#232711] outline-none focus-visible:ring-2 focus-visible:ring-[#4f5826]/35"
                >
                  <option value="">Celé Slovensko</option>
                  {SLOVAK_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#232711]/80" />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Ďalšie</h3>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  selected={draftSwap}
                  onClick={() => setDraftSwap((prev) => !prev)}
                  className="rounded-full border-[#ded7c6] bg-[#f8f4ec] px-5 text-[#232711] hover:border-[#d3ccb9] hover:bg-[#f5f1e8]"
                >
                  Výmena
                </FilterChip>
                <FilterChip
                  selected={draftVerified}
                  onClick={() => setDraftVerified((prev) => !prev)}
                  className="rounded-full border-[#ded7c6] bg-[#f8f4ec] px-5 text-[#232711] hover:border-[#d3ccb9] hover:bg-[#f5f1e8]"
                >
                  Overený predajca
                </FilterChip>
              </div>
            </section>
          </div>

          <DrawerFooter className="border-t bg-background pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={clearAll}>
                Vymazať
              </Button>
              <Button type="button" onClick={apply}>
                Zobraziť výsledky
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
