"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Gavel, ShieldCheck, Phone } from "lucide-react";

import type { FeedListingCard } from "@/lib/data/listings";
import { formatPrice } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { AuctionCountdown } from "@/components/feed/auction-countdown";
import { getRegionShortLabel } from "@/lib/regions";
import { cn } from "@/lib/utils";

type FeedListingCardProps = {
  listing: FeedListingCard;
  isAuthenticated?: boolean;
};

export function FeedListingCardComponent({
  listing,
  isAuthenticated = false,
}: FeedListingCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const priceLabel =
    listing.type === "fixed" && listing.fixed_price != null
      ? formatPrice(listing.fixed_price)
      : listing.type === "auction" && listing.auction_start_price != null
        ? `Od ${formatPrice(listing.auction_start_price)}`
        : "";

  return (
    <Link
      href={`/listing/${listing.id}`}
      className={cn(
        "focus-visible:ring-ring flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        "outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
      aria-label={`${listing.plant_name}, ${priceLabel || listing.type}`}
    >
      {/* Photo */}
      <div className="relative aspect-square w-full bg-muted">
        {listing.first_photo_url ? (
          <>
            {!imgLoaded && (
              <div
                className="absolute inset-0 animate-pulse bg-muted"
                aria-hidden
              />
            )}
            <img
              src={listing.first_photo_url}
              alt=""
              className={cn(
                "size-full object-cover transition-opacity duration-200",
                imgLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : (
          <span className="text-muted-foreground flex size-full items-center justify-center text-xs">
            Bez fotky
          </span>
        )}

        {/* Badges overlay */}
        <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
          {listing.type === "auction" && (
            <Badge variant="default" className="gap-0.5 px-1.5 py-0.5 text-[10px]">
              <Gavel className="size-3" aria-hidden />
              Aukcia
            </Badge>
          )}
          {listing.swap_enabled && (
            <Badge variant="secondary" className="gap-0.5 px-1.5 py-0.5 text-[10px]">
              <ArrowLeftRight className="size-3" aria-hidden />
              Výmena
            </Badge>
          )}
        </div>

        {listing.seller_phone_verified && (
          <div className="absolute top-1.5 right-1.5">
            <Badge variant="outline" className="gap-0.5 bg-background/80 px-1.5 py-0.5 text-[10px] backdrop-blur-sm">
              <ShieldCheck className="size-3" aria-hidden />
            </Badge>
          </div>
        )}

        <div
          className="absolute bottom-1.5 right-1.5 flex min-h-11 min-w-11 items-center justify-center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <SaveListingButton
            listingId={listing.id}
            isSaved={listing.is_saved ?? false}
            isAuthenticated={isAuthenticated}
            variant="icon"
            className="size-11 rounded-full bg-background/80 shadow backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-2">
        <span className="line-clamp-2 text-sm font-medium leading-tight">
          {listing.plant_name}
        </span>
        <div className="flex items-baseline justify-between gap-1">
          {priceLabel ? (
            <span className="text-sm font-semibold">{priceLabel}</span>
          ) : (
            <span className="text-muted-foreground text-xs">Aukcia</span>
          )}
          <span className="text-muted-foreground truncate text-[10px]">
            {getRegionShortLabel(listing.region)}
          </span>
        </div>
        {listing.type === "auction" && listing.auction_ends_at && (
          <AuctionCountdown endsAt={listing.auction_ends_at} />
        )}
        {/* Seller mini: avatar + rating + verified */}
        <div className="flex min-h-[44px] items-center gap-1.5 pt-0.5">
          <Avatar className="size-6 shrink-0">
            {listing.seller_avatar_url ? (
              <AvatarImage src={listing.seller_avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {listing.plant_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {listing.seller_ratings_avg != null && (
            <span className="text-muted-foreground text-[10px]">
              {Number(listing.seller_ratings_avg).toFixed(1)}
            </span>
          )}
          {listing.seller_phone_verified && (
            <Phone
              className="text-muted-foreground size-3.5 shrink-0"
              aria-label="Overený predajca"
            />
          )}
        </div>
      </div>
    </Link>
  );
}
