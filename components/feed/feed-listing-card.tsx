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

/** Iniciála pre avatar: prvé písmeno mena predajcu, inak prvé písmeno názvu rastliny. */
function getSellerInitial(displayName: string | null | undefined, plantName: string): string {
  const name = (displayName ?? "").trim();
  if (name.length > 0) return name.charAt(0).toUpperCase();
  return plantName.charAt(0).toUpperCase();
}

/** Prvé meno (prvý token) z display_name, alebo prázdny reťazec. */
function getSellerFirstName(displayName: string | null | undefined): string {
  const name = (displayName ?? "").trim();
  const first = name.split(/\s+/)[0];
  return first ?? "";
}

export function FeedListingCardComponent({
  listing,
  isAuthenticated = false,
}: FeedListingCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const sellerFirstName = getSellerFirstName(listing.seller_display_name);
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
      {/* Photo — fixed 1:1 ratio; any upload is cropped to fill (orez na výšku/šírku) */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
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
                "absolute inset-0 size-full object-cover object-center transition-opacity duration-200",
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
      <div className="flex flex-col gap-1 p-2">
        {/* Title — always reserves 2 lines (text-sm leading-tight ≈ 35px) for alignment */}
        <span className="line-clamp-2 min-h-[35px] text-sm font-medium leading-tight">
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
        {/* Seller mini — inicialky z mena, prvé meno */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Avatar className="size-6 shrink-0">
            {listing.seller_avatar_url ? (
              <AvatarImage src={listing.seller_avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="text-[10px] font-medium">
              {getSellerInitial(listing.seller_display_name, listing.plant_name)}
            </AvatarFallback>
          </Avatar>
          {sellerFirstName ? (
            <span className="text-muted-foreground min-w-0 truncate text-[11px] font-medium">
              {sellerFirstName}
            </span>
          ) : null}
          {listing.seller_ratings_avg != null && (
            <span className="text-muted-foreground shrink-0 text-[10px]">
              {Number(listing.seller_ratings_avg).toFixed(1)}
            </span>
          )}
          {listing.seller_phone_verified && (
            <Phone
              className="text-muted-foreground size-3 shrink-0"
              aria-label="Overený predajca"
            />
          )}
        </div>
      </div>
    </Link>
  );
}
