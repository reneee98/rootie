"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FeedListingCardSkeletonProps = {
  className?: string;
};

export function FeedListingCardSkeleton({
  className,
}: FeedListingCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-card",
        className
      )}
      aria-hidden
    >
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-1 p-2">
        <Skeleton className="min-h-[35px] w-3/4" />
        <div className="flex items-center justify-between gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-6" />
        </div>
      </div>
    </div>
  );
}
