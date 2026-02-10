"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  value: number;
  max?: number;
  size?: "sm" | "default";
  showValue?: boolean;
  count?: number;
  className?: string;
};

function RatingStars({
  value,
  max = 5,
  size = "default",
  showValue = false,
  count,
  className,
}: RatingStarsProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const sizeClass = size === "sm" ? "size-3" : "size-4";

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={count != null ? `${value} z ${max} (${count} hodnotení)` : `${value} z ${max}`}
    >
      {stars.map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            star <= Math.round(value) ? "fill-primary text-primary" : "text-muted"
          )}
          aria-hidden
        />
      ))}
      {showValue && (
        <span className="text-muted-foreground ml-0.5 text-xs">
          {Number(value).toFixed(1)}
        </span>
      )}
      {count != null && count > 0 && (
        <span className="text-muted-foreground/70 text-xs">({count})</span>
      )}
    </span>
  );
}

export { RatingStars };
