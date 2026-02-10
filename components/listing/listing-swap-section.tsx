"use client";

import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingSwapSectionProps = {
  swapEnabled: boolean;
  /** Optional preference text or tags from seller (if we add it to listing later) */
  preferenceText?: string | null;
  className?: string;
};

export function ListingSwapSection({
  swapEnabled,
  preferenceText,
  className,
}: ListingSwapSectionProps) {
  if (!swapEnabled) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4",
        className
      )}
    >
      <div className="flex items-center gap-2 font-medium text-primary">
        <ArrowLeftRight className="size-4 shrink-0" aria-hidden />
        Možná výmena
      </div>
      {preferenceText?.trim() && (
        <p className="text-muted-foreground mt-2 text-sm">
          {preferenceText.trim()}
        </p>
      )}
    </div>
  );
}
