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
        "flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        className
      )}
      aria-hidden
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <Skeleton className="size-full rounded-none" />
        <Skeleton className="absolute top-2 left-2 h-5 w-16 rounded-full" />
        <Skeleton className="absolute top-2 left-20 h-5 w-14 rounded-full" />
        <Skeleton className="absolute right-1.5 bottom-1.5 size-11 rounded-full" />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-2 border-t pt-2">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="ml-auto h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
