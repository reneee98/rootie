"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useState } from "react";
import { Search, ChevronDown } from "lucide-react";

import { ROOTIE_REGIONS, getRegionShortLabel } from "@/lib/regions";
import { PLANT_QUICK_CATEGORIES } from "@/lib/plant-quick-categories";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FilterChip } from "@/components/ui/filter-chip";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "newest", label: "Najnovšie" },
  { value: "ending_soon", label: "Končí čoskoro" },
  { value: "trending", label: "Trending" },
] as const;

export function FeedFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [regionDrawerOpen, setRegionDrawerOpen] = useState(false);

  const currentRegion = searchParams.get("region") || "All Slovakia";
  const currentSort = searchParams.get("sort") || "newest";
  const currentQuery = searchParams.get("q") || "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`/?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams, startTransition]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const q = (fd.get("q") as string)?.trim() || "";
      updateParams({ q });
    },
    [updateParams]
  );

  const isPlantCategorySelected = useCallback(
    (searchQuery: string) => {
      if (!currentQuery.trim()) return false;
      return currentQuery.trim().toLowerCase() === searchQuery.toLowerCase();
    },
    [currentQuery]
  );

  const handlePlantCategoryClick = useCallback(
    (searchQuery: string) => {
      const selected = isPlantCategorySelected(searchQuery);
      updateParams({ q: selected ? "" : searchQuery });
    },
    [isPlantCategorySelected, updateParams]
  );

  const handleRegionSelect = useCallback(
    (region: string) => {
      updateParams({ region });
      setRegionDrawerOpen(false);
    },
    [updateParams]
  );

  return (
    <div className="space-y-3" data-pending={isPending || undefined}>
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            key={`q-${currentQuery}`}
            name="q"
            type="search"
            defaultValue={currentQuery}
            placeholder="Hľadať (Monstera, Hoya…)"
            className="border-input bg-background focus-visible:ring-ring flex h-11 min-h-[44px] w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none focus-visible:ring-2"
            aria-label="Vyhľadávanie"
          />
        </div>
      </form>

      {/* Region pill + Sort row */}
      <div className="flex items-center gap-2">
        <Drawer
          open={regionDrawerOpen}
          onOpenChange={setRegionDrawerOpen}
          direction="bottom"
        >
          <DrawerTrigger asChild>
            <button
              type="button"
              className={cn(
                "border-input bg-background focus-visible:ring-ring inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2"
              )}
              aria-label="Vybrať kraj"
              aria-expanded={regionDrawerOpen}
            >
              <span className="text-muted-foreground">
                Kraj: {getRegionShortLabel(currentRegion)}
              </span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-4 transition-transform",
                  regionDrawerOpen && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          </DrawerTrigger>
          <DrawerContent
            className="rounded-t-2xl"
            style={{ touchAction: "none" }}
          >
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
            <DrawerHeader className="pb-2 text-center">
              <DrawerTitle>Vybrať kraj</DrawerTitle>
            </DrawerHeader>
            <ul className="max-h-[60vh] overflow-y-auto px-4 pb-8" role="listbox">
              {ROOTIE_REGIONS.map((r) => (
                <li key={r} role="option" aria-selected={currentRegion === r}>
                  <button
                    type="button"
                    onClick={() => handleRegionSelect(r)}
                    className={cn(
                      "flex w-full min-h-[44px] items-center justify-center rounded-lg py-3 text-sm font-medium transition-colors",
                      currentRegion === r
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {r === "All Slovakia" ? "Celé Slovensko" : r}
                  </button>
                </li>
              ))}
            </ul>
          </DrawerContent>
        </Drawer>

        {/* Sort dropdown */}
        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="border-input bg-background focus-visible:ring-ring flex h-11 min-h-[44px] flex-1 rounded-full border px-4 py-2 text-sm outline-none focus-visible:ring-2"
          aria-label="Zoradiť"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Plant quick categories — najčastejšie hľadané */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Kategórie rastlín"
      >
        {PLANT_QUICK_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <FilterChip
              key={cat.id}
              selected={isPlantCategorySelected(cat.searchQuery)}
              onClick={() => handlePlantCategoryClick(cat.searchQuery)}
              className="shrink-0 gap-1.5"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{cat.label}</span>
            </FilterChip>
          );
        })}
      </div>
    </div>
  );
}
