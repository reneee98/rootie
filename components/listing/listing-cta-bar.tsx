"use client";

import Link from "next/link";
import { MessageCircle, Bookmark, ArrowLeftRight } from "lucide-react";

import { getOrCreateListingThreadFormAction } from "@/lib/actions/listing-thread";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { Button } from "@/components/ui/button";
import { AuctionBidDrawer } from "@/components/listing/auction-bid-drawer";
import { cn } from "@/lib/utils";

type ListingCtaBarProps = {
  listingId: string;
  isOwnListing: boolean;
  isAuthenticated: boolean;
  isAuction: boolean;
  auctionEnded: boolean;
  status: string;
  isSaved: boolean;
  swapEnabled: boolean;
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
  isSaved,
  swapEnabled,
  auctionStartPrice = 0,
  auctionMinIncrement = 0,
  auctionEndsAt,
  currentBid = null,
  bidCount = 0,
}: ListingCtaBarProps) {
  const isSold = status === "sold";

  if (isOwnListing) {
    return (
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t backdrop-blur py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md px-4">
          <Button asChild className="min-h-11 flex-1" size="lg">
            <Link href={`/listing/${listingId}/edit`}>Upraviť inzerát</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t backdrop-blur py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md flex-wrap items-center gap-2 px-4">
        {/* Primary: Napísať predajcovi — always show unless sold and we want to hide */}
        <div className="flex min-h-11 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {isSold ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-lg border py-2.5 text-sm">
              Predané
            </div>
          ) : (
            <>
              {isAuthenticated ? (
                <form
                  action={getOrCreateListingThreadFormAction}
                  className="flex-1"
                >
                  <input type="hidden" name="listingId" value={listingId} />
                  <Button
                    type="submit"
                    className="min-h-11 w-full gap-2"
                    size="lg"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Napísať predajcovi
                  </Button>
                </form>
              ) : (
                <Button asChild className="min-h-11 flex-1 gap-2" size="lg">
                  <Link
                    href={`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`}
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Napísať predajcovi
                  </Link>
                </Button>
              )}
            </>
          )}

          {/* Secondary: Uložiť */}
          {isAuthenticated && (
            <SaveListingButton
              listingId={listingId}
              isSaved={isSaved}
              isAuthenticated={isAuthenticated}
              variant="label"
              className="min-h-11 shrink-0"
            />
          )}
        </div>

        {/* Auction: Pridať príhoz (when not ended) */}
        {isAuction && !auctionEnded && !isSold && (
          <div className="w-full sm:w-auto">
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

        {/* Swap: Navrhnúť výmenu (offer page is for fixed-price; auction users use Napísať predajcovi) */}
        {swapEnabled && !isSold && !isAuction && isAuthenticated && (
          <Button variant="outline" size="sm" className="min-h-11 gap-1.5" asChild>
            <Link href={`/listing/${listingId}/offer`}>
              <ArrowLeftRight className="size-4" aria-hidden />
              Navrhnúť výmenu
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
