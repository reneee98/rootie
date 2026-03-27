"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
};

function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  className,
  ariaLabel = "Vyberte možnosť",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-[44px] w-full rounded-[18px] border border-[#e9e2d1] bg-[#f1ece1] p-1",
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={cn(
              "flex-1 rounded-md py-2.5 text-sm font-medium transition-colors touch-manipulation",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected
                ? "rounded-[14px] bg-primary text-primary-foreground shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onValueChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
export type { SegmentOption };
