"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ChevronDown,
  Filter,
  MapPin,
  Search,
  X,
} from "lucide-react";

import { searchPlantTaxa, type PlantTaxonResult } from "@/lib/actions/plant-search";
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

type HomeFeedType = "all" | "fixed" | "auction";
type HomeSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "trending"
  | "ending_soon"
  | "auction_newest";

type FeedFiltersProps = {
  resultsCount?: number;
};

const STORED_FILTERS_KEY = "rootie:domov-filtre:v1";
const SEARCH_HISTORY_STORAGE_KEY = "rootie:search-history:v1";

const POPULAR_TAXA = [
  "Monstera deliciosa",
  "Monstera adansonii",
  "Hoya carnosa",
] as const;

const TYPE_OPTIONS: { value: HomeFeedType; label: string }[] = [
  { value: "all", label: "Všetko" },
  { value: "fixed", label: "Pevná cena" },
  { value: "auction", label: "Aukcie" },
];

const SORT_OPTIONS_DEFAULT: { value: HomeSort; label: string }[] = [
  { value: "newest", label: "Najnovšie" },
  { value: "price_asc", label: "Najlacnejšie" },
  { value: "price_desc", label: "Najdrahšie" },
  { value: "trending", label: "Trending" },
];

const SORT_OPTIONS_AUCTION: { value: HomeSort; label: string }[] = [
  { value: "ending_soon", label: "Končí čoskoro" },
  { value: "auction_newest", label: "Najnovšie aukcie" },
];

const AUCTION_ENDS_OPTIONS = [
  { value: "1", label: "1h" },
  { value: "6", label: "6h" },
  { value: "24", label: "24h" },
  { value: "168", label: "7 dní" },
] as const;

const CONDITION_OPTIONS = ["Nová", "Pekný stav", "Potrebuje starostlivosť"] as const;
const SIZE_OPTIONS = ["S", "M", "L"] as const;

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function readSearchHistoryFromStorage() {
  if (typeof window === "undefined") return [] as string[];
  const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, 8);
  } catch {
    return [] as string[];
  }
}

function parseType(value: string | null): HomeFeedType {
  if (value === "fixed" || value === "auction") return value;
  return "all";
}

function getDefaultSort(type: HomeFeedType): HomeSort {
  return type === "auction" ? "ending_soon" : "newest";
}

function parseSort(value: string | null, type: HomeFeedType): HomeSort {
  const allowed = type === "auction" ? SORT_OPTIONS_AUCTION : SORT_OPTIONS_DEFAULT;
  if (value && allowed.some((option) => option.value === value)) {
    return value as HomeSort;
  }
  return getDefaultSort(type);
}

function parsePositiveNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

function formatSortLabel(sort: HomeSort): string {
  const allOptions = [...SORT_OPTIONS_DEFAULT, ...SORT_OPTIONS_AUCTION];
  return allOptions.find((option) => option.value === sort)?.label ?? "Najnovšie";
}

function getFiltersActiveCount(params: URLSearchParams, type: HomeFeedType, sort: HomeSort) {
  const defaultsSort = getDefaultSort(type);
  let count = 0;
  if (params.get("region")) count += 1;
  if (type !== "all") count += 1;
  if (params.get("swap") === "1") count += 1;
  if (params.get("verified") === "1") count += 1;
  if (params.get("priceMin")) count += 1;
  if (params.get("priceMax")) count += 1;
  if (params.get("district")) count += 1;
  if (params.get("category")) count += 1;
  if (params.get("auctionEnds")) count += 1;
  if (params.get("auctionMinBid")) count += 1;
  if (params.get("minPhotos") === "3") count += 1;
  if (params.get("condition")) count += 1;
  if (params.get("size")) count += 1;
  if (sort !== defaultsSort) count += 1;
  return count;
}

export function FeedFilters({ resultsCount }: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  const restoreAttemptedRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const currentType = parseType(searchParams.get("type"));
  const currentSort = parseSort(searchParams.get("sort"), currentType);
  const currentQuery = (searchParams.get("q") ?? "").trim();
  const currentRegion = searchParams.get("region") ?? "";
  const currentSwap = searchParams.get("swap") === "1";
  const currentVerified = searchParams.get("verified") === "1";

  const currentCategory = searchParams.get("category") === "accessory" ? "accessory" : "plant";
  const currentDistrict = searchParams.get("district") ?? "";
  const currentPriceMin = searchParams.get("priceMin") ?? "";
  const currentPriceMax = searchParams.get("priceMax") ?? "";
  const currentAuctionEnds = searchParams.get("auctionEnds") ?? "";
  const currentAuctionMinBid = searchParams.get("auctionMinBid") ?? "";
  const currentMinPhotos = searchParams.get("minPhotos") === "3";
  const currentCondition = searchParams.get("condition") ?? "";
  const currentSize = searchParams.get("size") ?? "";

  const [draftType, setDraftType] = useState<HomeFeedType>(currentType);
  const [draftRegion, setDraftRegion] = useState(currentRegion);
  const [draftDistrict, setDraftDistrict] = useState(currentDistrict);
  const [draftCategory, setDraftCategory] = useState<"plant" | "accessory">(currentCategory);
  const [draftSwap, setDraftSwap] = useState(currentSwap);
  const [draftVerified, setDraftVerified] = useState(currentVerified);
  const [draftPriceMin, setDraftPriceMin] = useState(currentPriceMin);
  const [draftPriceMax, setDraftPriceMax] = useState(currentPriceMax);
  const [draftSort, setDraftSort] = useState<HomeSort>(currentSort);
  const [draftAuctionEnds, setDraftAuctionEnds] = useState(currentAuctionEnds);
  const [draftAuctionMinBid, setDraftAuctionMinBid] = useState(currentAuctionMinBid);
  const [draftMinPhotos, setDraftMinPhotos] = useState(currentMinPhotos);
  const [draftCondition, setDraftCondition] = useState(currentCondition);
  const [draftSize, setDraftSize] = useState(currentSize);
  const [searchInput, setSearchInput] = useState(currentQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PlantTaxonResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(readSearchHistoryFromStorage);

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return getFiltersActiveCount(params, currentType, currentSort);
  }, [currentSort, currentType, searchParams]);

  const updateParams = useCallback(
    (updates: Record<string, string>, options?: { replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");

      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });

      const qs = params.toString();
      startTransition(() => {
        if (options?.replace) {
          router.replace(qs ? `/?${qs}` : "/", { scroll: false });
          return;
        }
        router.push(qs ? `/?${qs}` : "/", { scroll: false });
      });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    window.localStorage.setItem(STORED_FILTERS_KEY, params.toString());
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const currentParams = new URLSearchParams(searchParams.toString());
    const hasAppliedParams = Array.from(currentParams.keys()).some(
      (key) => key !== "page"
    );
    if (hasAppliedParams) return;

    const stored = window.localStorage.getItem(STORED_FILTERS_KEY);
    if (!stored) return;
    const storedParams = new URLSearchParams(stored);
    if (Array.from(storedParams.keys()).length === 0) return;

    updateParams(Object.fromEntries(storedParams.entries()), { replace: true });
  }, [searchParams, updateParams]);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const term = searchInput.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      searchPlantTaxa(term)
        .then((data) => setSearchResults(data))
        .finally(() => setSearchLoading(false));
    }, 240);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const saveSearchToHistory = useCallback((value: string) => {
    if (typeof window === "undefined") return;
    const trimmed = value.trim();
    if (!trimmed) return;

    setSearchHistory((current) => {
      const next = [
        trimmed,
        ...current.filter((item) => normalizeSearchTerm(item) !== normalizeSearchTerm(trimmed)),
      ].slice(0, 8);
      window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const applySearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setSearchInput(trimmed);
      setSearchOpen(false);
      if (trimmed) {
        saveSearchToHistory(trimmed);
      }
      updateParams({ q: trimmed });
    },
    [saveSearchToHistory, updateParams]
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchOpen(false);
    updateParams({ q: "" });
  }, [updateParams]);

  const openFilters = useCallback(() => {
    setDraftType(currentType);
    setDraftRegion(currentRegion);
    setDraftDistrict(currentDistrict);
    setDraftCategory(currentCategory);
    setDraftSwap(currentSwap);
    setDraftVerified(currentVerified);
    setDraftPriceMin(currentPriceMin);
    setDraftPriceMax(currentPriceMax);
    setDraftSort(currentSort);
    setDraftAuctionEnds(currentAuctionEnds);
    setDraftAuctionMinBid(currentAuctionMinBid);
    setDraftMinPhotos(currentMinPhotos);
    setDraftCondition(currentCondition);
    setDraftSize(currentSize);
    setFilterOpen(true);
  }, [
    currentAuctionEnds,
    currentAuctionMinBid,
    currentCategory,
    currentCondition,
    currentDistrict,
    currentMinPhotos,
    currentPriceMax,
    currentPriceMin,
    currentRegion,
    currentSize,
    currentSort,
    currentSwap,
    currentType,
    currentVerified,
  ]);

  const setRegion = useCallback(
    (region: string) => {
      updateParams({ region });
      setRegionOpen(false);
    },
    [updateParams]
  );

  const setSort = useCallback(
    (sort: HomeSort) => {
      const defaultSort = getDefaultSort(currentType);
      updateParams({ sort: sort === defaultSort ? "" : sort });
      setSortOpen(false);
    },
    [currentType, updateParams]
  );

  const resetDraftFilters = useCallback(() => {
    setDraftType("all");
    setDraftRegion("");
    setDraftDistrict("");
    setDraftCategory("plant");
    setDraftSwap(false);
    setDraftVerified(false);
    setDraftPriceMin("");
    setDraftPriceMax("");
    setDraftSort("newest");
    setDraftAuctionEnds("");
    setDraftAuctionMinBid("");
    setDraftMinPhotos(false);
    setDraftCondition("");
    setDraftSize("");
  }, []);

  const clearAppliedFilters = useCallback(() => {
    updateParams({
      type: "",
      region: "",
      swap: "",
      verified: "",
      priceMin: "",
      priceMax: "",
      category: "",
      district: "",
      sort: "",
      auctionEnds: "",
      auctionMinBid: "",
      minPhotos: "",
      condition: "",
      size: "",
    });
  }, [updateParams]);

  const applyDraftFilters = useCallback(() => {
    const normalizedSort =
      draftType === "auction"
        ? SORT_OPTIONS_AUCTION.some((option) => option.value === draftSort)
          ? draftSort
          : "ending_soon"
        : SORT_OPTIONS_DEFAULT.some((option) => option.value === draftSort)
          ? draftSort
          : "newest";

    const defaultSort = getDefaultSort(draftType);

    updateParams({
      type: draftType === "all" ? "" : draftType,
      region: draftRegion,
      district: draftDistrict.trim(),
      category: draftCategory === "plant" ? "" : draftCategory,
      swap: draftSwap ? "1" : "",
      verified: draftVerified ? "1" : "",
      priceMin: draftPriceMin.trim(),
      priceMax: draftPriceMax.trim(),
      sort: normalizedSort === defaultSort ? "" : normalizedSort,
      auctionEnds: draftAuctionEnds,
      auctionMinBid: draftAuctionMinBid.trim(),
      minPhotos: draftMinPhotos ? "3" : "",
      condition: draftCondition,
      size: draftSize,
    });

    setFilterOpen(false);
  }, [
    draftAuctionEnds,
    draftAuctionMinBid,
    draftCategory,
    draftCondition,
    draftDistrict,
    draftMinPhotos,
    draftPriceMax,
    draftPriceMin,
    draftRegion,
    draftSize,
    draftSort,
    draftSwap,
    draftType,
    draftVerified,
    updateParams,
  ]);

  const sortOptions = currentType === "auction" ? SORT_OPTIONS_AUCTION : SORT_OPTIONS_DEFAULT;
  const regionLabel = currentRegion
    ? `Kraj: ${getRegionShortLabel(currentRegion)}`
    : "Kraj: Vyberte";

  const resultsLabel =
    typeof resultsCount === "number"
      ? `Zobraziť výsledky (${resultsCount})`
      : "Zobraziť výsledky";

  const searchSuggestions = useMemo(() => {
    const term = searchInput.trim();

    if (term.length >= 2 && searchResults.length > 0) {
      return searchResults.map((item) => item.canonical_name);
    }

    const base = [...searchHistory, ...POPULAR_TAXA];
    const unique = Array.from(new Set(base));
    if (!term) return unique.slice(0, 8);

    return unique
      .filter((item) => normalizeSearchTerm(item).includes(normalizeSearchTerm(term)))
      .slice(0, 8);
  }, [searchHistory, searchInput, searchResults]);

  const showSearchSuggestions = searchOpen && (
    searchInput.trim().length > 0 || searchHistory.length > 0 || POPULAR_TAXA.length > 0
  );

  return (
    <div className="space-y-3" data-pending={isPending || undefined}>
      <div className="space-y-1.5">
        <div ref={searchContainerRef} className="relative">
          <div className="border-input bg-background flex min-h-[44px] items-center rounded-full border px-3 py-1 shadow-sm">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <input
              value={searchInput}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch(searchInput);
                }
                if (event.key === "Escape") {
                  setSearchOpen(false);
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

          {showSearchSuggestions ? (
            <div className="border-input bg-background absolute z-20 mt-2 w-full rounded-2xl border p-2 shadow-lg">
              {searchLoading ? (
                <p className="text-muted-foreground px-2 py-2 text-xs">Hľadám návrhy…</p>
              ) : searchSuggestions.length > 0 ? (
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {searchSuggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="hover:bg-accent flex min-h-[42px] w-full items-center rounded-xl px-3 text-left text-sm"
                      onClick={() => applySearch(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground px-2 py-2 text-xs">Nenašli sa žiadne návrhy.</p>
              )}
            </div>
          ) : null}
        </div>

        <p className="text-muted-foreground px-1 text-xs">
          Tip: Skús napísať „mons“ a vyber z návrhov 👀
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

        <FilterChip onClick={openFilters} className="min-h-[40px] shrink-0">
          Cena
        </FilterChip>

        <FilterChip
          selected={currentSort !== getDefaultSort(currentType)}
          onClick={() => setSortOpen(true)}
          className="min-h-[40px] shrink-0"
        >
          Triediť
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
                currentRegion === "All Slovakia" && "border-primary text-primary"
              )}
              onClick={() => setRegion("All Slovakia")}
            >
              <span>Celé Slovensko</span>
              {currentRegion === "All Slovakia" ? <span>✓</span> : null}
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

      <Drawer open={sortOpen} onOpenChange={setSortOpen} direction="bottom">
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>Triediť</DrawerTitle>
            <p className="text-muted-foreground text-xs">Nájdi to, čo sa oplatí najviac.</p>
          </DrawerHeader>

          <div className="space-y-2 px-4 pb-5">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                className={cn(
                  "border-input bg-background hover:bg-accent flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 text-left text-sm",
                  currentSort === option.value && "border-primary text-primary"
                )}
              >
                <span>{option.label}</span>
                {currentSort === option.value ? <span>✓</span> : null}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={filterOpen} onOpenChange={setFilterOpen} direction="bottom">
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader className="pb-1 text-left">
            <DrawerTitle>Filtre</DrawerTitle>
            <p className="text-muted-foreground text-xs">Nájdi presne to, čo hľadáš.</p>
          </DrawerHeader>

          <div className="max-h-[62vh] space-y-5 overflow-y-auto px-4 pb-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Základ</h3>

              <div className="space-y-1.5">
                <p className="text-xs font-medium">Typ</p>
                <SegmentedControl
                  ariaLabel="Typ"
                  value={draftType}
                  onValueChange={setDraftType}
                  options={TYPE_OPTIONS}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="home-filter-region" className="text-xs font-medium">
                  Kraj
                </label>
                <select
                  id="home-filter-region"
                  value={draftRegion}
                  onChange={(event) => setDraftRegion(event.target.value)}
                  className="border-input bg-background focus-visible:ring-ring h-11 min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
                >
                  <option value="">Vybrať kraj</option>
                  <option value="All Slovakia">Celé Slovensko</option>
                  {SLOVAK_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="home-filter-district" className="text-xs font-medium">
                  Okres
                </label>
                <input
                  id="home-filter-district"
                  value={draftDistrict}
                  onChange={(event) => setDraftDistrict(event.target.value)}
                  placeholder="Vybrať okres (voliteľné)"
                  className="border-input bg-background focus-visible:ring-ring h-11 min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium">Kategória</p>
                <SegmentedControl
                  ariaLabel="Kategória"
                  value={draftCategory}
                  onValueChange={(value) => setDraftCategory(value as "plant" | "accessory")}
                  options={[
                    { value: "plant", label: "Rastliny" },
                    { value: "accessory", label: "Príslušenstvo" },
                  ]}
                />
              </div>

              <button
                type="button"
                onClick={() => setDraftSwap((value) => !value)}
                className={cn(
                  "border-input bg-background flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 text-sm",
                  draftSwap && "border-primary text-primary"
                )}
              >
                <span>Výmena</span>
                <span>{draftSwap ? "Zapnuté" : "Vypnuté"}</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftVerified((value) => !value)}
                className={cn(
                  "border-input bg-background flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 text-sm",
                  draftVerified && "border-primary text-primary"
                )}
              >
                <span>Len overení predajcovia</span>
                <span>{draftVerified ? "Zapnuté" : "Vypnuté"}</span>
              </button>

              <div className="space-y-2">
                <p className="text-xs font-medium">Cena</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={draftPriceMin}
                    onChange={(event) => setDraftPriceMin(event.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder="Od"
                    className="border-input bg-background focus-visible:ring-ring h-11 min-h-[44px] rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
                  />
                  <input
                    value={draftPriceMax}
                    onChange={(event) => setDraftPriceMax(event.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder="Do"
                    className="border-input bg-background focus-visible:ring-ring h-11 min-h-[44px] rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={300}
                  step={5}
                  value={parsePositiveNumber(draftPriceMax) ?? 0}
                  onChange={(event) => setDraftPriceMax(event.target.value)}
                  className="w-full accent-[var(--color-primary)]"
                  aria-label="Maximálna cena"
                />
              </div>
            </section>

            {(draftType === "all" || draftType === "auction") && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Aukcie</h3>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Končí do</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {AUCTION_ENDS_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        selected={draftAuctionEnds === option.value}
                        onClick={() =>
                          setDraftAuctionEnds((current) =>
                            current === option.value ? "" : option.value
                          )
                        }
                        className="min-h-[38px] px-3 py-1.5 text-xs"
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="home-filter-min-bid" className="text-xs font-medium">
                    Minimálny príhoz (voliteľné)
                  </label>
                  <input
                    id="home-filter-min-bid"
                    value={draftAuctionMinBid}
                    onChange={(event) =>
                      setDraftAuctionMinBid(event.target.value.replace(/[^0-9]/g, ""))
                    }
                    inputMode="numeric"
                    className="border-input bg-background focus-visible:ring-ring h-11 min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
                  />
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Kvalita</h3>

              <button
                type="button"
                onClick={() => setDraftMinPhotos((value) => !value)}
                className={cn(
                  "border-input bg-background flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 text-sm",
                  draftMinPhotos && "border-primary text-primary"
                )}
              >
                <span>Len s 3+ fotkami</span>
                <span>{draftMinPhotos ? "Zapnuté" : "Vypnuté"}</span>
              </button>

              <div className="space-y-1.5">
                <p className="text-xs font-medium">Stav</p>
                <div className="flex flex-wrap gap-2">
                  {CONDITION_OPTIONS.map((condition) => (
                    <FilterChip
                      key={condition}
                      selected={draftCondition === condition}
                      onClick={() =>
                        setDraftCondition((current) =>
                          current === condition ? "" : condition
                        )
                      }
                      className="min-h-[38px] px-3 py-1.5 text-xs"
                    >
                      {condition}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium">Veľkosť (S/M/L)</p>
                <div className="flex gap-2">
                  {SIZE_OPTIONS.map((size) => (
                    <FilterChip
                      key={size}
                      selected={draftSize === size}
                      onClick={() =>
                        setDraftSize((current) => (current === size ? "" : size))
                      }
                      className="min-h-[38px] px-4 py-1.5 text-xs"
                    >
                      {size}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </section>

            <p className="text-muted-foreground pb-1 text-[11px] leading-relaxed">
              Rootie nerieši platbu ani dopravu, dohodnite sa priamo s predajcom cez Inbox.
            </p>
          </div>

          <DrawerFooter className="border-t bg-background pt-3">
            <Button type="button" className="min-h-[44px] w-full" onClick={applyDraftFilters}>
              {resultsLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-[44px] w-full"
              onClick={() => {
                resetDraftFilters();
                clearAppliedFilters();
                setFilterOpen(false);
              }}
            >
              Vymazať filtre
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {currentQuery ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="bg-secondary text-secondary-foreground inline-flex min-h-[32px] items-center gap-1 rounded-full px-3 text-xs font-medium"
            onClick={clearSearch}
            aria-label="Odobrať vybranú rastlinu"
          >
            {currentQuery}
            <X className="size-3" aria-hidden />
          </button>
        </div>
      ) : null}

      {activeFilterCount > 0 ? (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Aktívne filtre: {activeFilterCount}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
            onClick={clearAppliedFilters}
          >
            Vymazať filtre
          </button>
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">Zoradenie: {formatSortLabel(currentSort)}</p>
    </div>
  );
}
