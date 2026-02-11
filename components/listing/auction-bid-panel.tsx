"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Euro, Gavel, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { placeBid } from "@/lib/actions/place-bid";
import { formatPrice } from "@/lib/formatters";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type AuctionBidPanelProps = {
  listingId: string;
  auctionStartPrice: number;
  auctionMinIncrement: number;
  auctionEndsAt: string;
  initialCurrentBid: number | null;
  initialBidCount: number;
  isAuthenticated: boolean;
  isOwnListing: boolean;
};

/* ------------------------------------------------------------------ */
/* Countdown helper                                                    */
/* ------------------------------------------------------------------ */

function formatCountdown(endsAt: Date): { text: string; ended: boolean } {
  const diff = endsAt.getTime() - Date.now();

  if (diff <= 0) return { text: "Aukcia skončila", ended: true };

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  if (days > 0) return { text: `${days}d ${hours}h ${minutes}m`, ended: false };
  if (hours > 0)
    return { text: `${hours}h ${minutes}m ${seconds}s`, ended: false };
  return { text: `${minutes}m ${seconds}s`, ended: false };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AuctionBidPanel({
  listingId,
  auctionStartPrice,
  auctionMinIncrement,
  auctionEndsAt,
  initialCurrentBid,
  initialBidCount,
  isAuthenticated,
  isOwnListing,
}: AuctionBidPanelProps) {
  const endsAtDate = new Date(auctionEndsAt);

  /* Bid state */
  const [currentBid, setCurrentBid] = useState(initialCurrentBid);
  const [bidCount, setBidCount] = useState(initialBidCount);
  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  /* Timer state */
  const [countdown, setCountdown] = useState(() =>
    formatCountdown(endsAtDate)
  );

  /* Derived */
  const currentPrice = currentBid ?? auctionStartPrice;
  const minBid =
    currentBid != null ? currentPrice + auctionMinIncrement : auctionStartPrice;
  const isEnded = countdown.ended;

  /* ---- Countdown timer ---- */
  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(endsAtDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionEndsAt]);

  /* ---- Realtime subscription ---- */
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`bids-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const newAmount = Number(payload.new.amount);
          setCurrentBid((prev) =>
            prev === null || newAmount > prev ? newAmount : prev
          );
          setBidCount((prev) => prev + 1);
          /* Clear previous success to highlight incoming bid */
          setSuccess("");
        }
      )
      .subscribe();

    return () => {
      const channelToRemove = channel;
      setTimeout(() => {
        supabase.removeChannel(channelToRemove);
      }, 0);
    };
  }, [listingId]);

  /* ---- Pre-fill input with min bid when it changes ---- */
  useEffect(() => {
    setBidAmount(minBid.toString());
  }, [minBid]);

  /* ---- Submit handler ---- */
  const handleSubmit = useCallback(() => {
    const amount = parseFloat(bidAmount);

    if (isNaN(amount) || amount <= 0) {
      setError("Zadajte platnú sumu.");
      return;
    }

    if (amount < minBid) {
      setError(`Minimálna ponuka je ${formatPrice(minBid)}.`);
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      const result = await placeBid(listingId, amount);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Ponuka ${formatPrice(result.amount)} bola prijatá!`);
      setBidAmount("");
    });
  }, [bidAmount, listingId, minBid, startTransition]);

  /* ---- Render ---- */
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Gavel className="size-4" aria-hidden />
        Aukcia
      </h2>

      {/* Current price + bid count */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {currentBid != null ? "Aktuálna ponuka" : "Začiatočná cena"}
          </p>
          <p className="text-2xl font-bold">{formatPrice(currentPrice)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="size-3" aria-hidden />
          {bidCount}{" "}
          {bidCount === 1 ? "ponuka" : bidCount < 5 ? "ponuky" : "ponúk"}
        </div>
      </div>

      {/* Time remaining */}
      <div
        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
          isEnded
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Clock className="size-4 shrink-0" aria-hidden />
        <span>{countdown.text}</span>
      </div>

      {/* Bid input — only when auction is active and user can bid */}
      {!isEnded && !isOwnListing && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Euro className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                inputMode="decimal"
                min={minBid}
                step="0.5"
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={!isAuthenticated || isPending}
                placeholder={`min. ${formatPrice(minBid)}`}
                className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-base font-semibold outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] disabled:opacity-50"
                aria-label="Suma ponuky"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!isAuthenticated || isPending || isEnded}
              size="lg"
              className="h-12 shrink-0 px-6"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Prihodiť"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Min. príhoz: {formatPrice(auctionMinIncrement)}
          </p>

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground">
              <Link
                href={`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`}
                className="text-primary underline"
              >
                Prihláste sa
              </Link>{" "}
              pre pridanie ponuky.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-emerald-600">{success}</p>
          )}
        </div>
      )}

      {isOwnListing && !isEnded && (
        <p className="text-xs text-muted-foreground">
          Toto je váš inzerát. Nemôžete prihodiť.
        </p>
      )}
    </div>
  );
}
