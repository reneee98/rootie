"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { FeedListingCardSkeleton } from "@/components/feed/feed-listing-card-skeleton";

export function FeedHomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* Filters */}
      <div className="space-y-3">
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-40 rounded-full" />
          <Skeleton className="h-11 flex-1 rounded-full" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* Trending strip */}
      <div>
        <Skeleton className="mb-2 h-4 w-36" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <FeedListingCardSkeleton
              key={i}
              className="w-[160px] shrink-0 sm:w-[180px]"
            />
          ))}
        </div>
      </div>

      {/* Ending soon strip */}
      <div>
        <Skeleton className="mb-2 h-4 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <FeedListingCardSkeleton
              key={i}
              className="w-[160px] shrink-0 sm:w-[180px]"
            />
          ))}
        </div>
      </div>

      {/* Nové prírastky grid */}
      <div>
        <Skeleton className="mb-2 h-4 w-28" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <FeedListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
