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
  const wrapperClass =
    "fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f4] px-[14px] pt-[15px] pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-25px_50px_rgba(0,0,0,0.25)]";
  const ctaButtonClass =
    "h-[49px] w-full gap-[8.75px] rounded-[14px] bg-[#c4c35b] text-[14px] font-medium text-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:bg-[#c4c35b]/90";

  if (isOwnListing) {
    return (
      <div className={wrapperClass}>
        <div className="mx-auto flex max-w-md">
          <Button asChild className={ctaButtonClass} size="lg">
            <Link href={`/listing/${listingId}/edit`}>Upraviť inzerát</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isAuction) {
    return (
      <div className={wrapperClass}>
        <div className="mx-auto flex max-w-md">
          {isSold ? (
            isAuctionWinner ? (
              isAuthenticated ? (
                <form action={getOrCreateListingThreadFormAction} className="w-full">
                  <input type="hidden" name="listingId" value={listingId} />
                  <Button type="submit" className={ctaButtonClass} size="lg">
                    <Handshake className="size-4" aria-hidden />
                    Kontaktovať predajcu
                  </Button>
                </form>
              ) : (
                <Button asChild className={ctaButtonClass} size="lg">
                  <Link href={`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`}>
                    <Handshake className="size-4" aria-hidden />
                    Kontaktovať predajcu
                  </Link>
                </Button>
              )
            ) : (
              <div className="flex h-[49px] w-full items-center justify-center rounded-[14px] border border-[#d6cfbc] bg-[#faf8f4] text-sm text-[#67635c]">
                Predané
              </div>
            )
          ) : auctionEnded ? (
            <div className="flex h-[49px] w-full items-center justify-center rounded-[14px] border border-[#d6cfbc] bg-[#faf8f4] text-sm text-[#67635c]">
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
    <div className={wrapperClass}>
      <div className="mx-auto flex max-w-md">
        {isSold ? (
          <div className="flex h-[49px] w-full items-center justify-center rounded-[14px] border border-[#d6cfbc] bg-[#faf8f4] text-sm text-[#67635c]">
            Predané
          </div>
        ) : isAuthenticated ? (
          <Button asChild className={ctaButtonClass} size="lg">
            <Link href={`/listing/${listingId}/offer`}>
              <Handshake className="size-4" aria-hidden />
              Poslať ponuku
            </Link>
          </Button>
        ) : (
          <Button asChild className={ctaButtonClass} size="lg">
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
