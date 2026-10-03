"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";

import { HOME_SEARCH_CHIPS } from "@/lib/home-search-chips";
import { FilterChip } from "@/components/ui/filter-chip";
import { getRegionShortLabel } from "@/lib/regions";

type WantedIntent = "" | "buy" | "swap" | "both";

const INTENT_CHIPS: { value: Exclude<WantedIntent, "">; label: string }[] = [
  { value: "buy", label: "Kúpa" },
  { value: "swap", label: "Výmena" },
  { value: "both", label: "Oboje" },
];

function parseIntent(value: string | null): WantedIntent {
  if (value === "buy" || value === "swap" || value === "both") return value;
  return "";
}

export function WantedFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentIntent = parseIntent(searchParams.get("intent"));
  const currentQuery = (searchParams.get("q") || "").trim();
  const currentRegion = searchParams.get("region") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");

      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }

      startTransition(() => {
        const qs = params.toString();
        router.push(qs ? `/wanted?${qs}` : "/wanted", { scroll: false });
      });
    },
    [router, searchParams, startTransition]
  );

  const hasAppliedFilters = useMemo(
    () => Boolean(currentQuery) || Boolean(currentIntent) || Boolean(currentRegion),
    [currentIntent, currentQuery, currentRegion]
  );

  return (
    <div className="space-y-2" data-pending={isPending || undefined}>
      {hasAppliedFilters ? (
        <p className="text-primary text-xs font-medium">Filtrujem podľa zadania</p>
      ) : null}

      <div
        className="-mx-[14px] flex gap-[8.75px] overflow-x-auto overflow-y-hidden pl-[14px] pr-[14px] pb-[2px] whitespace-nowrap touch-pan-x snap-x snap-mandatory scroll-pl-[14px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filtre Hľadám"
      >
        {currentRegion ? (
          <FilterChip selected onClick={() => updateParams({ region: "" })} className="h-[54px] shrink-0 rounded-[18px] px-[14px] text-[12px]">
            {getRegionShortLabel(currentRegion)} ×
          </FilterChip>
        ) : null}
        {HOME_SEARCH_CHIPS.map((chipLabel) => {
          const isSelected = currentQuery === chipLabel;
          return (
            <FilterChip
              key={chipLabel}
              selected={isSelected}
              onClick={() =>
                updateParams({
                  q: isSelected ? "" : chipLabel,
                })
              }
              className="h-[54px] min-h-0 shrink-0 snap-start rounded-[18px] bg-[#faf8f4] px-[8px] py-[8px] text-[12px] font-medium leading-[21px] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
            >
              <span className="inline-flex items-center gap-[6px]">
                <span className="flex size-[38px] items-center justify-center rounded-full bg-[#f1ece1] p-[2px]">
                  <Image
                    src="/figma-home/chip-21404-icon.svg"
                    alt=""
                    width={23}
                    height={23}
                    className="size-[23px]"
                  />
                </span>
                {chipLabel}
              </span>
            </FilterChip>
          );
        })}

        {INTENT_CHIPS.map((intentOption) => (
          <FilterChip
            key={intentOption.value}
            selected={currentIntent === intentOption.value}
            onClick={() =>
              updateParams({
                intent: currentIntent === intentOption.value ? "" : intentOption.value,
              })
            }
            className="h-[54px] min-h-0 shrink-0 snap-start rounded-[18px] bg-[#faf8f4] px-[14px] text-[12px] font-medium leading-[21px] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
          >
            {intentOption.label}
          </FilterChip>
        ))}

        {hasAppliedFilters ? (
          <FilterChip
            onClick={() =>
              updateParams({
                q: "",
                intent: "",
                region: "",
              })
            }
            className="h-[54px] min-h-0 shrink-0 snap-start rounded-[18px] bg-[#f6f3ed] px-[14px] text-[12px] font-medium leading-[21px] text-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
          >
            Reset
          </FilterChip>
        ) : null}
      </div>
    </div>
  );
}
