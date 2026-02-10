"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";
import { ROOTIE_REGIONS } from "@/lib/regions";

const INTENT_OPTIONS = [
  { value: "", label: "Všetky úmysly" },
  { value: "buy", label: "Kúpiť" },
  { value: "swap", label: "Vymeniť" },
  { value: "both", label: "Kúpiť aj vymeniť" },
] as const;

export function WantedFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentRegion = searchParams.get("region") || "All Slovakia";
  const currentIntent = searchParams.get("intent") || "";
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
        router.push(`/wanted?${params.toString()}`, { scroll: false });
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

  return (
    <div className="space-y-3" data-pending={isPending || undefined}>
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            name="q"
            type="search"
            defaultValue={currentQuery}
            placeholder="Názov rastliny…"
            className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border py-2 pr-3 pl-9 text-sm outline-none focus-visible:ring-2"
            aria-label="Vyhľadávanie"
          />
        </div>
        <button
          type="submit"
          className="border-input bg-background focus-visible:ring-ring inline-flex h-11 items-center rounded-md border px-4 text-sm font-medium outline-none focus-visible:ring-2"
        >
          Hľadať
        </button>
      </form>

      <select
        value={currentRegion}
        onChange={(e) => updateParams({ region: e.target.value })}
        className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        aria-label="Kraj"
      >
        {ROOTIE_REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <select
          value={currentIntent}
          onChange={(e) => updateParams({ intent: e.target.value })}
          className="border-input bg-background flex h-9 shrink-0 rounded-md border px-2 text-xs outline-none"
          aria-label="Úmysel"
        >
          {INTENT_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
