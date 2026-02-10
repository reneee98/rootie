"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { ROOTIE_REGIONS } from "@/lib/regions";

type SavedListingsFiltersProps = {
  currentRegion: string;
};

export function SavedListingsFilters({
  currentRegion,
}: SavedListingsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleRegionChange = (region: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (region && region !== "All Slovakia") {
      params.set("region", region);
    } else {
      params.delete("region");
    }
    startTransition(() => {
      router.push(`/saved?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-2" data-pending={isPending || undefined}>
      <label htmlFor="saved-region" className="text-muted-foreground text-sm">
        Kraj
      </label>
      <select
        id="saved-region"
        value={currentRegion}
        onChange={(e) => handleRegionChange(e.target.value)}
        className="border-input bg-background focus-visible:ring-ring flex h-9 rounded-md border px-3 py-1 text-sm outline-none focus-visible:ring-2"
        aria-label="Filter podľa kraja"
      >
        {ROOTIE_REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
