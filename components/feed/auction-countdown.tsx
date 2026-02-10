"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

type AuctionCountdownProps = {
  endsAt: string;
};

export function AuctionCountdown({ endsAt }: AuctionCountdownProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Skončila");
        return;
      }

      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);

      if (days > 0) {
        setLabel(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setLabel(`${hours}h ${minutes}m`);
      } else {
        setLabel(`${minutes}m`);
      }
    };

    update();
    /* Update every 30s for feed cards (detail uses 1s) */
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <Clock className="size-2.5" aria-hidden />
      {label}
    </span>
  );
}
