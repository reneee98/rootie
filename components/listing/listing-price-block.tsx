"use client";

import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ListingPriceBlockProps = {
  type: "fixed" | "auction";
  fixedPrice: number | null;
  currentBid: number | null;
  auctionStartPrice: number | null;
  bidCount: number;
  auctionEndsAt: string | null;
  /** When true (auction ended), show "Aukcia skončila" instead of countdown */
  auctionEnded?: boolean;
  /** Optional "Dohodou" label for fixed price */
  priceNegotiable?: boolean;
};

function formatCountdown(endsAt: Date): { text: string; ended: boolean } {
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return { text: "Aukcia skončila", ended: true };
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return { text: `Končí za ${hours}h ${minutes}m`, ended: false };
  const mins = Math.floor(diff / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return { text: `Končí za ${mins}m ${secs}s`, ended: false };
}

export function ListingPriceBlock({
  type,
  fixedPrice,
  currentBid,
  auctionStartPrice,
  bidCount,
  auctionEndsAt,
  auctionEnded = false,
  priceNegotiable = false,
}: ListingPriceBlockProps) {
  const isFixed = type === "fixed";
  const auctionPrice = currentBid ?? auctionStartPrice ?? 0;

  const [countdown, setCountdown] = useState<{ text: string; ended: boolean }>(
    () =>
      auctionEndsAt && !auctionEnded
        ? formatCountdown(new Date(auctionEndsAt))
        : { text: "Aukcia skončila", ended: true }
  );

  useEffect(() => {
    if (!auctionEndsAt || auctionEnded) return;
    const endsAt = new Date(auctionEndsAt);
    const tick = () => setCountdown(formatCountdown(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [auctionEndsAt, auctionEnded]);

  if (isFixed) {
    const showPrice = fixedPrice != null && fixedPrice > 0;
    return (
      <div className="space-y-1">
        <p className="text-3xl font-bold tracking-tight">
          {showPrice ? formatPrice(fixedPrice) : "Dohodou"}
        </p>
        {showPrice && priceNegotiable && (
          <p className="text-muted-foreground text-sm">Dohodou</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-xs">
            {currentBid != null ? "Aktuálna cena" : "Začiatočná cena"}
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatPrice(auctionPrice)}
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          {bidCount} {bidCount === 1 ? "príhoz" : bidCount < 5 ? "príhozy" : "príhozov"}
        </p>
      </div>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
          countdown.ended
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary"
        )}
      >
        <span>{countdown.text}</span>
      </div>
    </div>
  );
}
