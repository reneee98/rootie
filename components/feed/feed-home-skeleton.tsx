"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { FeedListingCardSkeleton } from "@/components/feed/feed-listing-card-skeleton";

export function FeedHomeSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="space-y-1.5">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-3 w-72 rounded" />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
        <div className="flex gap-2 overflow-hidden pb-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">Načítavam ponuky…</p>

      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <FeedListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
