"use client";

import * as React from "react";
import { Euro, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type OfferCardProps = {
  type: "price" | "swap";
  amount?: number;
  body?: string;
  isCounterOffer?: boolean;
  className?: string;
};

function OfferCard({
  type,
  amount,
  body,
  isCounterOffer = false,
  className,
}: OfferCardProps) {
  const label =
    type === "price"
      ? isCounterOffer
        ? "Protiponuka"
        : "Ponuka ceny"
      : "Ponuka výmeny";

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 p-3",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        {type === "price" ? (
          <Euro className="size-3.5" aria-hidden />
        ) : (
          <ArrowLeftRight className="size-3.5" aria-hidden />
        )}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-sm font-medium">
        {type === "price" && amount != null
          ? `${Number(amount).toFixed(2)} €`
          : body ?? "Ponúkam výmenu."}
      </div>
    </div>
  );
}

export { OfferCard };
