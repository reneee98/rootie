"use client";

import Link from "next/link";
import { Gavel, Clock, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SellerAuctionListing, BidderAuctionListing } from "@/lib/data/auction-bids";
import { formatPrice, formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Countdown (static - rendered at page load)
// ---------------------------------------------------------------------------

function auctionStatus(endsAt: string): { label: string; ended: boolean } {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Skončená", ended: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return { label: `Končí o ${days}d ${hours}h`, ended: false };
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { label: `Končí o ${hours}h ${minutes}m`, ended: false };
}

// ===========================================================================
// SELLER: auction card with full bid list
// ===========================================================================

type SellerAuctionCardProps = {
  listing: SellerAuctionListing;
};

function SellerAuctionCard({ listing }: SellerAuctionCardProps) {
  const status = auctionStatus(listing.auction_ends_at);
  const topBid = listing.bids[0]?.amount ?? null;

  return (
    <div className="rounded-lg border bg-card">
      {/* Listing header */}
      <Link
        href={`/listing/${listing.listing_id}`}
        className="flex gap-3 p-3 hover:bg-accent/50 transition-colors rounded-t-lg"
      >
        {listing.image_url && (
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              src={listing.image_url}
              alt=""
              className="size-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Gavel className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
            <span className="font-semibold text-sm truncate">
              {listing.plant_name}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Štart: {formatPrice(listing.auction_start_price)}</span>
            {topBid != null && (
              <span className="font-medium text-foreground">
                Top: {formatPrice(topBid)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
            <Clock className="size-3 shrink-0" aria-hidden />
            <span
              className={cn(
                status.ended
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {status.label}
            </span>
            <span className="ml-auto text-muted-foreground inline-flex items-center gap-1">
              <TrendingUp className="size-3" aria-hidden />
              {listing.bids.length}{" "}
              {listing.bids.length === 1
                ? "ponuka"
                : listing.bids.length < 5
                  ? "ponuky"
                  : "ponúk"}
            </span>
          </div>
        </div>
      </Link>

      {/* Bids list */}
      {listing.bids.length === 0 ? (
        <div className="border-t px-3 py-4 text-center text-xs text-muted-foreground">
          Zatiaľ žiadne ponuky.
        </div>
      ) : (
        <ul className="border-t divide-y" role="list">
          {listing.bids.map((bid, i) => {
            const name = bid.bidder.display_name?.trim() || "Používateľ";
            const initials = name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("") || "?";
            const isTop = i === 0;

            return (
              <li
                key={bid.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5",
                  isTop && "bg-emerald-50/60 dark:bg-emerald-950/20"
                )}
              >
                <Avatar size="sm">
                  {bid.bidder.avatar_url ? (
                    <AvatarImage src={bid.bidder.avatar_url} alt={name} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm truncate",
                        isTop ? "font-semibold" : "font-medium"
                      )}
                    >
                      {name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        isTop ? "text-emerald-700 dark:text-emerald-400" : ""
                      )}
                    >
                      {formatPrice(bid.amount)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateTime(bid.created_at)}
                  </p>
                </div>

                {isTop && (
                  <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    TOP
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ===========================================================================
// BIDDER: compact card showing my bid status
// ===========================================================================

type BidderAuctionCardProps = {
  listing: BidderAuctionListing;
};

function BidderAuctionCard({ listing }: BidderAuctionCardProps) {
  const status = auctionStatus(listing.auction_ends_at);
  const sellerName = listing.seller.display_name?.trim() || "Predajca";

  return (
    <Link
      href={`/listing/${listing.listing_id}`}
      className="flex gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
    >
      {/* Photo */}
      {listing.image_url ? (
        <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
          <img
            src={listing.image_url}
            alt=""
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
          <Gavel className="size-5 text-muted-foreground" aria-hidden />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">
            {listing.plant_name}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground truncate">
          od {sellerName}
        </p>

        {/* Bid status */}
        <div className="mt-1 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              listing.is_winning
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            )}
          >
            {listing.is_winning ? (
              <>
                <ArrowUp className="size-3" aria-hidden />
                Vyhrávaš
              </>
            ) : (
              <>
                <ArrowDown className="size-3" aria-hidden />
                Prekonaný
              </>
            )}
          </span>
        </div>

        {/* Numbers row */}
        <div className="mt-1 flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Moja: <span className="font-semibold text-foreground tabular-nums">{formatPrice(listing.my_highest_bid)}</span>
          </span>
          <span className="text-muted-foreground">
            Top: <span className="font-semibold text-foreground tabular-nums">{formatPrice(listing.top_bid)}</span>
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-0.5">
            <TrendingUp className="size-3" aria-hidden />
            {listing.total_bid_count}
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className="flex shrink-0 flex-col items-end justify-between">
        <span
          className={cn(
            "text-[10px] font-medium",
            status.ended ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {status.label}
        </span>
      </div>
    </Link>
  );
}

// ===========================================================================
// Full auction tab content: seller section + bidder section
// ===========================================================================

type AuctionBidsListProps = {
  sellerListings: SellerAuctionListing[];
  bidderListings: BidderAuctionListing[];
};

export function AuctionBidsList({ sellerListings, bidderListings }: AuctionBidsListProps) {
  const hasSellerListings = sellerListings.length > 0;
  const hasBidderListings = bidderListings.length > 0;

  if (!hasSellerListings && !hasBidderListings) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-muted-foreground text-sm">
          Nemáte žiadne aktívne aukcie.
        </p>
        <p className="text-muted-foreground text-xs">
          Vytvorte aukčný inzerát alebo prihoďte na existujúcu aukciu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bidder auctions: where I placed bids */}
      {hasBidderListings && (
        <div className="space-y-2">
          {hasSellerListings && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Moje ponuky
            </h3>
          )}
          <div className="space-y-2">
            {bidderListings.map((listing) => (
              <BidderAuctionCard key={listing.listing_id} listing={listing} />
            ))}
          </div>
        </div>
      )}

      {/* Seller auctions: my listings with all bids */}
      {hasSellerListings && (
        <div className="space-y-2">
          {hasBidderListings && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Moje aukcie
            </h3>
          )}
          <div className="space-y-3">
            {sellerListings.map((listing) => (
              <SellerAuctionCard key={listing.listing_id} listing={listing} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
