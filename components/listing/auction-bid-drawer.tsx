"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { AuctionBidPanel } from "@/components/listing/auction-bid-panel";
import { Button } from "@/components/ui/button";
import { Gavel } from "lucide-react";

type AuctionBidDrawerProps = {
  listingId: string;
  auctionStartPrice: number;
  auctionMinIncrement: number;
  auctionEndsAt: string;
  initialCurrentBid: number | null;
  initialBidCount: number;
  isAuthenticated: boolean;
  isOwnListing: boolean;
};

export function AuctionBidDrawer({
  listingId,
  auctionStartPrice,
  auctionMinIncrement,
  auctionEndsAt,
  initialCurrentBid,
  initialBidCount,
  isAuthenticated,
  isOwnListing,
}: AuctionBidDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11 gap-1.5"
          aria-label="Pridať príhoz"
        >
          <Gavel className="size-4" aria-hidden />
          Pridať príhoz
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh] rounded-t-2xl">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
        <DrawerHeader className="pb-0 text-center">
          <DrawerTitle>Príhoz do aukcie</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">
          <AuctionBidPanel
            listingId={listingId}
            auctionStartPrice={auctionStartPrice}
            auctionMinIncrement={auctionMinIncrement}
            auctionEndsAt={auctionEndsAt}
            initialCurrentBid={initialCurrentBid}
            initialBidCount={initialBidCount}
            isAuthenticated={isAuthenticated}
            isOwnListing={isOwnListing}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
