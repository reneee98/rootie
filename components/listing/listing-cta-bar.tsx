"use client";

import Link from "next/link";
import { Handshake } from "lucide-react";

import { getOrCreateListingThreadFormAction } from "@/lib/actions/listing-thread";
import { Button } from "@/components/ui/button";
import { AuctionBidDrawer } from "@/components/listing/auction-bid-drawer";

type ListingCtaBarProps = {
  listingId: string;
  isOwnListing: boolean;
  isAuthenticated: boolean;
  isAuction: boolean;
  auctionEnded: boolean;
  status: string;
  isAuctionWinner?: boolean;
  /** For auction: bid drawer props */
  auctionStartPrice?: number;
  auctionMinIncrement?: number;
  auctionEndsAt?: string | null;
  currentBid?: number | null;
  bidCount?: number;
};

export function ListingCtaBar({
  listingId,
  isOwnListing,
  isAuthenticated,
  isAuction,
  auctionEnded,
  status,
  isAuctionWinner = false,
  auctionStartPrice = 0,
  auctionMinIncrement = 0,
  auctionEndsAt,
  currentBid = null,
  bidCount = 0,
}: ListingCtaBarProps) {
  const isSold = status === "sold";

  if (isOwnListing) {
    return (
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t backdrop-blur">
        <div className="mx-auto flex max-w-md px-4 py-3">
          <Button asChild className="min-h-11 flex-1" size="lg">
            <Link href={`/listing/${listingId}/edit`}>Upraviť inzerát</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isAuction) {
    return (
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t backdrop-blur">
        <div className="mx-auto flex max-w-md px-4 py-3">
          {isSold ? (
            isAuctionWinner ? (
              isAuthenticated ? (
                <form action={getOrCreateListingThreadFormAction} className="w-full">
                  <input type="hidden" name="listingId" value={listingId} />
                  <Button type="submit" className="min-h-11 w-full gap-2" size="lg">
                    <Handshake className="size-4" aria-hidden />
                    Kontaktovať predajcu
                  </Button>
                </form>
              ) : (
                <Button asChild className="min-h-11 w-full gap-2" size="lg">
                  <Link href={`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`}>
                    <Handshake className="size-4" aria-hidden />
                    Kontaktovať predajcu
                  </Link>
                </Button>
              )
            ) : (
              <div className="text-muted-foreground flex w-full items-center justify-center rounded-lg border py-2.5 text-sm">
                Predané
              </div>
            )
          ) : auctionEnded ? (
            <div className="text-muted-foreground flex w-full items-center justify-center rounded-lg border py-2.5 text-sm">
              Aukcia skončila
            </div>
          ) : (
            <div className="w-full">
              <AuctionBidDrawer
                listingId={listingId}
                auctionStartPrice={auctionStartPrice}
                auctionMinIncrement={auctionMinIncrement}
                auctionEndsAt={auctionEndsAt ?? ""}
                initialCurrentBid={currentBid}
                initialBidCount={bidCount}
                isAuthenticated={isAuthenticated}
                isOwnListing={false}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t backdrop-blur">
      <div className="mx-auto flex max-w-md px-4 py-3">
        {isSold ? (
          <div className="text-muted-foreground flex w-full items-center justify-center rounded-lg border py-2.5 text-sm">
            Predané
          </div>
        ) : isAuthenticated ? (
          <Button asChild className="min-h-11 w-full gap-2" size="lg">
            <Link href={`/listing/${listingId}/offer`}>
              <Handshake className="size-4" aria-hidden />
              Poslať ponuku
            </Link>
          </Button>
        ) : (
          <Button asChild className="min-h-11 w-full gap-2" size="lg">
            <Link href={`/login?next=${encodeURIComponent(`/listing/${listingId}/offer`)}`}>
              <Handshake className="size-4" aria-hidden />
              Poslať ponuku
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
