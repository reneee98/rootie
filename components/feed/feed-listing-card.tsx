"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ImageOff, ShieldCheck, Star } from "lucide-react";

import type { FeedListingCard } from "@/lib/data/listings";
import { formatPrice } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { AuctionCountdown } from "@/components/feed/auction-countdown";
import { cn } from "@/lib/utils";

type FeedListingCardProps = {
  listing: FeedListingCard;
  isAuthenticated?: boolean;
};

function getSellerInitial(displayName: string | null | undefined, plantName: string): string {
  const value = (displayName ?? "").trim();
  if (value.length > 0) return value.charAt(0).toUpperCase();
  return plantName.charAt(0).toUpperCase();
}

function getSellerShortName(displayName: string | null | undefined): string {
  const name = (displayName ?? "").trim();
  if (!name) return "Predajca";
  const first = name.split(/\s+/)[0] ?? "";
  return first || "Predajca";
}

function formatRating(avg: number | null, count: number): string {
  if (avg == null || Number.isNaN(avg)) return "Nový";
  const rating = avg.toFixed(1).replace(".", ",");
  return `${rating} (${count})`;
}

function getAuctionPrice(listing: FeedListingCard): string {
  const value = listing.current_bid ?? listing.auction_start_price;
  if (value == null) return "Aktuálne: --";
  return `Aktuálne: ${formatPrice(value)}`;
}

export function FeedListingCardComponent({
  listing,
  isAuthenticated = false,
}: FeedListingCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleImageRef = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;
    if (!node.complete) return;
    if (node.naturalWidth <= 16 || node.naturalHeight <= 16) {
      setImgFailed(true);
      setImgLoaded(true);
      return;
    }
    setImgLoaded(true);
  }, []);

  const sellerName = getSellerShortName(listing.seller_display_name);
  const fixedPriceLabel =
    listing.fixed_price != null ? formatPrice(listing.fixed_price) : "Dohodou";

  return (
    <Link
      href={`/listing/${listing.id}`}
      className={cn(
        "focus-visible:ring-ring flex flex-col overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm",
        "outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
      aria-label={listing.plant_name}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {listing.first_photo_url && !imgFailed ? (
          <>
            {!imgLoaded ? (
              <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
            ) : null}
            <img
              ref={handleImageRef}
              src={listing.first_photo_url}
              alt=""
              className={cn(
                "absolute inset-0 size-full object-cover object-center transition-opacity duration-200",
                imgLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              onLoad={(event) => {
                const image = event.currentTarget;
                if (image.naturalWidth <= 16 || image.naturalHeight <= 16) {
                  setImgFailed(true);
                  setImgLoaded(true);
                  return;
                }
                setImgLoaded(true);
              }}
              onError={() => {
                setImgFailed(true);
                setImgLoaded(true);
              }}
            />
          </>
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1 text-xs">
            <ImageOff className="size-4" aria-hidden />
            <span>Bez fotky</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
          {listing.type === "auction" ? (
            <Badge className="rounded-full px-2 py-1 text-[10px] tracking-wide uppercase">
              AUKCIA
            </Badge>
          ) : null}
          {listing.swap_enabled ? (
            <Badge variant="secondary" className="gap-1 rounded-full px-2 py-1 text-[10px] uppercase">
              <ArrowLeftRight className="size-3" aria-hidden />
              VÝMENA
            </Badge>
          ) : null}
        </div>

        {isAuthenticated ? (
          <div
            className="absolute right-2 bottom-2"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <SaveListingButton
              listingId={listing.id}
              isSaved={listing.is_saved ?? false}
              isAuthenticated={isAuthenticated}
              variant="icon"
              className="size-11 rounded-full border-0 bg-background/90 shadow-sm backdrop-blur"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-snug">
          {listing.plant_name}
        </p>

        {listing.type === "auction" ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold">{getAuctionPrice(listing)}</p>
            <div className="flex items-center gap-2 text-[11px]">
              {listing.auction_ends_at ? (
                <AuctionCountdown endsAt={listing.auction_ends_at} withPrefix />
              ) : (
                <span className="text-muted-foreground">Koniec aukcie sa pripravuje</span>
              )}
              {listing.bid_count > 0 ? (
                <span className="text-muted-foreground">{listing.bid_count} príhozov</span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm font-semibold">{fixedPriceLabel}</p>
        )}

        <p className="text-muted-foreground text-[11px]">{listing.region}</p>

        <div className="border-border/70 flex items-center gap-2 border-t pt-2">
          <Avatar className="size-7 shrink-0">
            {listing.seller_avatar_url ? <AvatarImage src={listing.seller_avatar_url} alt="" /> : null}
            <AvatarFallback className="text-[10px] font-medium">
              {getSellerInitial(listing.seller_display_name, listing.plant_name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium">{sellerName}</p>
            <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <Star className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                {formatRating(listing.seller_ratings_avg, listing.seller_ratings_count)}
              </span>
            </p>
          </div>

          {listing.seller_phone_verified ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
              <ShieldCheck className="size-3" aria-hidden />
              Overený telefón
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
