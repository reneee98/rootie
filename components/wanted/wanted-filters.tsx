"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, Filter, MapPin, Search, X } from "lucide-react";

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

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [draftRegion, setDraftRegion] = useState(currentRegion);
  const [draftIntent, setDraftIntent] = useState<WantedIntent>(currentIntent);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

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

  const applySearch = useCallback(
    (value: string) => {
      const q = value.trim();
      setSearchInput(q);
      updateParams({ q });
    },
    [updateParams]
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    updateParams({ q: "" });
  }, [updateParams]);

  const openFilters = useCallback(() => {
    setDraftRegion(currentRegion);
    setDraftIntent(currentIntent);
    setFilterOpen(true);
  }, [currentIntent, currentRegion]);

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
  }, [updateParams]);

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
      <div className="space-y-1.5">
        <div className="relative">
          <div className="border-input bg-background flex min-h-[44px] items-center rounded-full border px-3 py-1 shadow-sm">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch(searchInput);
                }
              }}
              placeholder="Hľadať rastlinu… (Monstera, Hoya, Alocasia)"
              className="h-11 min-h-[44px] w-full bg-transparent px-2 text-sm outline-none"
              aria-label="Hľadať rastlinu"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={clearSearch}
                className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
                aria-label="Odstrániť vyhľadávanie"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <p className="text-muted-foreground px-1 text-xs">
          Tip: Skús napísať „mons“ a vyber z kategórií nižšie.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRegionOpen(true)}
          className="min-h-[44px] justify-between rounded-full px-3 text-sm"
          aria-label="Vybrať kraj"
        >
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {regionLabel}
          </span>
          <ChevronDown className="size-4" aria-hidden />
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={openFilters}
          className="relative min-h-[44px] min-w-[44px] rounded-full px-3"
          aria-label="Otvoriť filtre"
        >
          <Filter className="size-4" aria-hidden />
          <span className="ml-1 text-sm font-medium">Filtre</span>
          {activeFilterCount > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      {activeFilterCount > 0 ? (
        <p className="text-primary text-xs font-medium">Upravené podľa teba</p>
      ) : null}

      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              className="min-h-[40px] shrink-0"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5" aria-hidden />
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
            className="min-h-[40px] shrink-0"
          >
            {intentOption.label}
          </FilterChip>
        ))}

        <FilterChip onClick={openFilters} className="min-h-[40px] shrink-0">
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
