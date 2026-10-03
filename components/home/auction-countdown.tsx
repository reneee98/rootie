"use client";

import { useEffect, useState } from "react";

function formatCountdown(endsAt: string | null) {
  if (!endsAt) return "Končí čoskoro";

  const diff = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(diff)) return "Koniec aukcie nie je známy";
  if (diff <= 0) return "Skončené";

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);

  if (days > 0) return `Končí za ${days}d ${hours}h`;
  return `Končí za ${hours}h ${minutes}m ${seconds}s`;
}

export function AuctionCountdown({ endsAt }: { endsAt: string | null }) {
  const [label, setLabel] = useState("Načítavam čas…");

  useEffect(() => {
    const update = () => setLabel(formatCountdown(endsAt));
    update();
    const timer = setInterval(() => {
      update();
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return <>{label}</>;
}
