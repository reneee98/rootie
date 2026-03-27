"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { searchPlantTaxa, type PlantTaxonResult } from "@/lib/actions/plant-search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HISTORY_STORAGE_KEY = "rootie:search-history:v1";

const POPULAR_TAXA = [
  "Monstera deliciosa",
  "Monstera adansonii",
  "Hoya carnosa",
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

  const noMatches = query.trim().length >= 2 && !isSearching && visibleTaxa.length === 0;

  const closeSearch = useCallback(() => {
    const nextParams = withUpdatedParams(searchParams, { q: query.trim() });
    const nextQs = nextParams.toString();
    router.push(nextQs ? `/?${nextQs}` : "/");
  }, [query, router, searchParams]);

  const submitSearch = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      applySearchAndGoHome(query);
    },
    [applySearchAndGoHome, query]
  );

  return (
    <div className="min-h-dvh bg-[#faf8f4]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="rootie-page-title">Hľadať</h1>
            <button
              type="button"
              onClick={closeSearch}
              className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] items-center gap-1 rounded-[14px] px-2 text-sm"
              aria-label="Zavrieť hľadanie"
            >
              Zavrieť
            </button>
          </div>

          <form onSubmit={submitSearch} className="rootie-surface flex min-h-[44px] items-center rounded-[18px] px-3">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              autoFocus
              enterKeyHint="search"
              placeholder="Začni písať… (napr. mons, hoya, albo)"
              className="search-no-native-cancel h-11 min-h-[44px] w-full bg-transparent px-2 text-sm outline-none"
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
          </form>

          <p className="text-muted-foreground text-xs">
            Vyber z návrhov a hľadanie bude presnejšie.
          </p>
        </header>

        <div className="mt-3 flex-1 space-y-4 overflow-y-auto pb-2">
          {noMatches ? (
            <section className="rootie-surface rounded-2xl p-4 text-center">
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
                        className="rootie-surface hover:bg-accent flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-sm"
                        onClick={() => applySearchAndGoHome(name)}
                      >
                        {name}
                      </button>
                    ))
                  )}
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
                        className="rootie-surface hover:bg-accent flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-sm"
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
      </div>
    </div>
  );
}
