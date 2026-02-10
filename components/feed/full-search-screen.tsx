"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";

import { searchPlantTaxa, type PlantTaxonResult } from "@/lib/actions/plant-search";
import { FilterChip } from "@/components/ui/filter-chip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HISTORY_STORAGE_KEY = "rootie:search-history:v1";

const POPULAR_TAXA = [
  "Monstera deliciosa",
  "Monstera adansonii",
  "Hoya carnosa",
] as const;

const SHORTCUTS = [
  { key: "albo", label: "albo → Monstera albo variegata", value: "Monstera albo variegata" },
  { key: "thai", label: "thai → Thai Constellation", value: "Thai Constellation" },
] as const;

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function withUpdatedParams(
  current: URLSearchParams,
  updates: Record<string, string>
): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  params.delete("page");
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  return params;
}

function readHistoryFromStorage() {
  if (typeof window === "undefined") return [] as string[];
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed
      .filter((value): value is string => typeof value === "string")
      .slice(0, 8);
  } catch {
    return [] as string[];
  }
}

export function FullSearchScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialQuery = (searchParams.get("q") ?? "").trim();
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PlantTaxonResult[]>([]);
  const [history, setHistory] = useState<string[]>(readHistoryFromStorage);

  const saveToHistory = useCallback((value: string) => {
    if (typeof window === "undefined") return;
    const trimmed = value.trim();
    if (!trimmed) return;

    setHistory((current) => {
      const next = [trimmed, ...current.filter((item) => normalize(item) !== normalize(trimmed))].slice(0, 8);
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
    setHistory([]);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = query.trim();
    if (term.length < 2) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      setIsSearching(true);
      searchPlantTaxa(term)
        .then((data) => {
          setResults(data);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 260);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
    }
  }, []);

  const filteredShortcuts = useMemo(() => {
    const term = normalize(query);
    if (!term) return SHORTCUTS;
    return SHORTCUTS.filter(
      (shortcut) => normalize(shortcut.key).includes(term) || normalize(shortcut.value).includes(term)
    );
  }, [query]);

  const visibleTaxa = useMemo(() => {
    if (query.trim().length >= 2) {
      return results.map((item) => item.canonical_name);
    }
    return [...POPULAR_TAXA];
  }, [query, results]);

  const applySearchAndGoHome = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const nextParams = withUpdatedParams(searchParams, { q: trimmed });
      if (trimmed) saveToHistory(trimmed);
      const qs = nextParams.toString();
      router.push(qs ? `/?${qs}` : "/");
    },
    [router, saveToHistory, searchParams]
  );

  const applyQuickFilterAndGoHome = useCallback(
    (chip: "auction" | "swap" | "verified") => {
      const base = {
        q: query.trim(),
      };
      if (chip === "auction") {
        const params = withUpdatedParams(searchParams, {
          ...base,
          type: "auction",
          sort: "ending_soon",
        });
        router.push(`/?${params.toString()}`);
        return;
      }
      if (chip === "swap") {
        const params = withUpdatedParams(searchParams, {
          ...base,
          swap: "1",
        });
        router.push(`/?${params.toString()}`);
        return;
      }
      const params = withUpdatedParams(searchParams, {
        ...base,
        verified: "1",
      });
      router.push(`/?${params.toString()}`);
    },
    [query, router, searchParams]
  );

  const noMatches =
    query.trim().length >= 2 && !isSearching && visibleTaxa.length === 0 && filteredShortcuts.length === 0;

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Link
          href={searchParams.toString() ? `/?${searchParams.toString()}` : "/"}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Späť na Domov
        </Link>

        <h1 className="text-lg font-semibold">Hľadať</h1>

        <div className="border-input bg-background flex min-h-[44px] items-center rounded-full border px-3 shadow-sm">
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <input
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            autoFocus
            placeholder="Začni písať… (napr. mons, hoya, albo)"
            className="h-11 min-h-[44px] w-full bg-transparent px-2 text-sm outline-none"
            aria-label="Hľadať rastlinu"
          />
          {query ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
              onClick={() => handleQueryChange("")}
              aria-label="Vymazať hľadanie"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <p className="text-muted-foreground text-xs">
          Vyber z návrhov a hľadanie bude presnejšie.
        </p>
      </header>

      {noMatches ? (
        <section className="border-input rounded-2xl border p-4 text-center">
          <h2 className="text-sm font-semibold">Nič sme nenašli pre „{query.trim()}“</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Nechaj to na komunitu, pridaj Hľadám a ľudia sa ti ozvú.
          </p>
          <div className="mt-3 space-y-2">
            <Button asChild className="min-h-[44px] w-full">
              <Link href="/wanted/create">Vytvoriť Hľadám</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full"
              onClick={() => handleQueryChange("")}
            >
              Skúsiť iný názov
            </Button>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Rastliny</h2>
            <div className="space-y-2">
              {isSearching ? (
                <p className="text-muted-foreground text-xs">Hľadám návrhy…</p>
              ) : (
                visibleTaxa.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="border-input bg-background hover:bg-accent flex min-h-[44px] w-full items-center rounded-xl border px-3 text-left text-sm"
                    onClick={() => applySearchAndGoHome(name)}
                  >
                    {name}
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Populárne skratky</h2>
            <div className="space-y-2">
              {filteredShortcuts.map((shortcut) => (
                <button
                  key={shortcut.key}
                  type="button"
                  className="border-input bg-background hover:bg-accent flex min-h-[44px] w-full items-center rounded-xl border px-3 text-left text-sm"
                  onClick={() => applySearchAndGoHome(shortcut.value)}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Rýchle filtre</h2>
            <div className="flex flex-wrap gap-2">
              <FilterChip className="min-h-[38px] px-3 py-1.5 text-xs" onClick={() => applyQuickFilterAndGoHome("auction")}>
                Aukcie
              </FilterChip>
              <FilterChip className="min-h-[38px] px-3 py-1.5 text-xs" onClick={() => applyQuickFilterAndGoHome("swap")}>
                Výmena
              </FilterChip>
              <FilterChip className="min-h-[38px] px-3 py-1.5 text-xs" onClick={() => applyQuickFilterAndGoHome("verified")}>
                Overení
              </FilterChip>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">História</h2>
              <button
                type="button"
                onClick={clearHistory}
                className={cn(
                  "text-xs underline underline-offset-2",
                  history.length > 0 ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/40"
                )}
                disabled={history.length === 0}
              >
                Vymazať históriu
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-muted-foreground text-xs">Monstera / Hoya / Alocasia</p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="border-input bg-background hover:bg-accent flex min-h-[44px] w-full items-center rounded-xl border px-3 text-left text-sm"
                    onClick={() => applySearchAndGoHome(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
