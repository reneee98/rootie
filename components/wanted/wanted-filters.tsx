"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronDown, MapPin } from "lucide-react";

import { PLANT_QUICK_CATEGORIES } from "@/lib/plant-quick-categories";
import { SLOVAK_REGIONS, getRegionShortLabel } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

type WantedIntent = "" | "buy" | "swap" | "both";

const INTENT_OPTIONS: { value: WantedIntent; label: string }[] = [
  { value: "", label: "Všetko" },
  { value: "buy", label: "Kúpiť" },
  { value: "swap", label: "Vymeniť" },
  { value: "both", label: "Kúpiť / vymeniť" },
];

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
  const [regionOpen, setRegionOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const currentRegionRaw = searchParams.get("region") || "";
  const currentRegion = currentRegionRaw === "All Slovakia" ? "" : currentRegionRaw;
  const currentIntent = parseIntent(searchParams.get("intent"));
  const currentQuery = (searchParams.get("q") || "").trim();

  const [draftRegion, setDraftRegion] = useState(currentRegion);
  const [draftIntent, setDraftIntent] = useState<WantedIntent>(currentIntent);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        const normalizedValue = key === "region" && value === "All Slovakia" ? "" : value;
        if (normalizedValue) {
          params.set(key, normalizedValue);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        const qs = params.toString();
        router.push(qs ? `/wanted?${qs}` : "/wanted", { scroll: false });
      });
    },
    [router, searchParams, startTransition]
  );

  const openFilters = useCallback(() => {
    setDraftRegion(currentRegion);
    setDraftIntent(currentIntent);
    setFilterOpen(true);
  }, [currentIntent, currentRegion, setDraftIntent, setDraftRegion]);

  const applyDraftFilters = useCallback(() => {
    updateParams({
      region: draftRegion,
      intent: draftIntent,
    });
    setFilterOpen(false);
  }, [draftIntent, draftRegion, updateParams]);

  const clearAppliedFilters = useCallback(() => {
    setDraftRegion("");
    setDraftIntent("");
    updateParams({
      region: "",
      intent: "",
    });
    setFilterOpen(false);
  }, [updateParams, setDraftIntent, setDraftRegion]);

  const setRegion = useCallback(
    (region: string) => {
      updateParams({ region });
      setRegionOpen(false);
    },
    [updateParams]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentRegion) count += 1;
    if (currentIntent) count += 1;
    return count;
  }, [currentIntent, currentRegion]);

  const regionLabel = currentRegion
    ? `Kraj: ${getRegionShortLabel(currentRegion)}`
    : "Kraj: Vyberte";

  return (
    <div className="space-y-3" data-pending={isPending || undefined}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRegionOpen(true)}
          className="h-[44px] justify-between rounded-[18px] border-[#c4c35b]/25 bg-[#faf8f4] px-3 text-[12px]"
          aria-label="Vybrať kraj"
        >
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {regionLabel}
          </span>
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </div>

      {activeFilterCount > 0 ? (
        <p className="text-primary text-xs font-medium">Upravené podľa teba</p>
      ) : null}

      <div
        className="-mx-[14px] flex gap-[8.75px] overflow-x-auto overflow-y-hidden pl-[14px] pr-[14px] pb-[2px] whitespace-nowrap touch-pan-x snap-x snap-mandatory scroll-pl-[14px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Rýchle kategórie a filtre"
      >
        {PLANT_QUICK_CATEGORIES.map((quickCategory) => {
          const Icon = quickCategory.icon;
          const isSelected = currentQuery.toLowerCase() === quickCategory.searchQuery.toLowerCase();
          return (
          <FilterChip
            key={quickCategory.id}
            selected={isSelected}
              onClick={() =>
                updateParams({
                  q: isSelected ? "" : quickCategory.searchQuery,
                })
              }
            className="h-[54px] min-h-0 shrink-0 snap-start rounded-[18px] bg-[#faf8f4] px-[8px] py-[8px] text-[12px] font-medium leading-[21px] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
          >
            <span className="inline-flex items-center gap-[6px]">
              <span className="flex size-[38px] items-center justify-center rounded-full bg-[#f1ece1] p-[2px]">
                <Icon className="size-[18px] text-[#67635c]" aria-hidden />
              </span>
              {quickCategory.label}
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

        <FilterChip
          onClick={openFilters}
          className="h-[54px] min-h-0 shrink-0 snap-start rounded-[18px] bg-[#faf8f4] px-[14px] text-[12px] font-medium leading-[21px] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
        >
          Úmysel
        </FilterChip>
      </div>

      <Drawer open={regionOpen} onOpenChange={setRegionOpen} direction="bottom">
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>Vyber kraj</DrawerTitle>
          </DrawerHeader>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-4">
            <button
              type="button"
              className={cn(
                "border-input bg-background hover:bg-accent flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 text-left text-sm",
                !currentRegion && "border-primary text-primary"
              )}
              onClick={() => setRegion("")}
            >
              <span>Celé Slovensko</span>
              {!currentRegion ? <span>✓</span> : null}
            </button>

            {SLOVAK_REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                className={cn(
                  "border-input bg-background hover:bg-accent flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 text-left text-sm",
                  currentRegion === region && "border-primary text-primary"
                )}
                onClick={() => setRegion(region)}
              >
                <span>{region}</span>
                {currentRegion === region ? <span>✓</span> : null}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={filterOpen} onOpenChange={setFilterOpen} direction="bottom">
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader className="pb-1 text-left">
            <DrawerTitle>Filtre</DrawerTitle>
            <p className="text-muted-foreground text-xs">Nastav si Hľadám podľa seba.</p>
          </DrawerHeader>

          <div className="max-h-[62vh] space-y-5 overflow-y-auto px-4 pb-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Základ</h3>

              <div className="space-y-1.5">
                <p className="text-xs font-medium">Úmysel</p>
                <SegmentedControl
                  ariaLabel="Úmysel"
                  value={draftIntent}
                  onValueChange={setDraftIntent}
                  options={INTENT_OPTIONS}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="wanted-filter-region" className="text-xs font-medium">
                  Kraj
                </label>
                <select
                  id="wanted-filter-region"
                  value={draftRegion}
                  onChange={(event) => setDraftRegion(event.target.value)}
                  className="border-input bg-background focus-visible:ring-ring h-11 min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
                >
                  <option value="">Celé Slovensko</option>
                  {SLOVAK_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>

          <DrawerFooter className="border-t bg-background pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={clearAppliedFilters}>
                Vymazať
              </Button>
              <Button type="button" onClick={applyDraftFilters}>
                Zobraziť výsledky
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
