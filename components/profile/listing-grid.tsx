import Link from "next/link";

import type { ListingCard } from "@/lib/data/profile";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ListingGridProps = {
  listings: ListingCard[];
  className?: string;
  emptyText?: string;
};

function ListingCardCell({ listing }: { listing: ListingCard }) {
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
        "min-h-[120px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
      aria-label={`${listing.plant_name}, ${priceLabel}`}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
        {listing.first_photo_url ? (
          <img
            src={listing.first_photo_url}
            alt=""
            className="absolute inset-0 size-full object-cover object-center"
          />
        ) : (
          <span className="text-muted-foreground flex size-full items-center justify-center text-xs">
            Bez fotky
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <span className="line-clamp-2 text-sm font-medium">
          {listing.plant_name}
        </span>
        {priceLabel ? (
          <span className="text-muted-foreground text-xs">{priceLabel}</span>
        ) : null}
      </div>
    </Link>
  );
}

export function ListingGrid({
  listings,
  className,
  emptyText = "Tento používateľ nemá žiadne aktívne inzeráty.",
}: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {emptyText}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        className
      )}
      role="list"
    >
      {listings.map((listing) => (
        <ListingCardCell key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
