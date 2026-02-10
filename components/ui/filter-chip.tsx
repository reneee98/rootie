"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type FilterChipProps = React.ComponentProps<"button"> & {
  selected?: boolean;
};

const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  function FilterChip({ className, selected, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors touch-manipulation",
          "border-input bg-background hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          className
        )}
        aria-pressed={selected}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export { FilterChip };
