import { notFound } from "next/navigation";
import {
  ArrowLeftRight,
  Gavel,
  MapPin,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { ListingDetailHeader } from "@/components/listing/listing-detail-header";
import { ListingPriceBlock } from "@/components/listing/listing-price-block";
import { ListingReactionsBar } from "@/components/listing/listing-reactions-bar";
import { ListingSellerBlock } from "@/components/listing/listing-seller-block";
import { ListingDetailsAccordion } from "@/components/listing/listing-details-accordion";
import { SafetyTipBox } from "@/components/listing/safety-tip-box";
import { ListingSwapSection } from "@/components/listing/listing-swap-section";
import { ListingCtaBar } from "@/components/listing/listing-cta-bar";
import { getListingDetail } from "@/lib/data/listings";
import { getUser } from "@/lib/auth";
import { getRegionShortLabel } from "@/lib/regions";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const currentUser = await getUser();
  const listing = await getListingDetail(id, currentUser?.id ?? undefined);

  if (!listing || listing.status === "removed") {
    notFound();
  }

  const isOwnListing = currentUser?.id === listing.seller_id;
  const isAuthenticated = !!currentUser;
  const isFixed = listing.type === "fixed";
  const isReserved = listing.status === "reserved";
  const isSold = listing.status === "sold";
  let isAuctionWinner = false;

  if (!isFixed && currentUser) {
    const supabase = await createSupabaseServerClient();
    const { data: topBid } = await supabase
      .from("bids")
      .select("bidder_id")
      .eq("listing_id", listing.id)
      .order("amount", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    isAuctionWinner = listing.status === "sold" && topBid?.bidder_id === currentUser.id;
  }

  const auctionEnded = !isFixed && listing.status === "expired";

  return (
    <div className="bg-background min-h-dvh pb-40">
      <ListingDetailHeader
        listingId={listing.id}
        isSaved={listing.is_saved}
        isAuthenticated={isAuthenticated}
        title={listing.plant_name}
      />

      <main className="mx-auto max-w-md px-0">
        {/* Photo gallery */}
        <PhotoGallery photos={listing.photos} alt={listing.plant_name} />

        <div className="space-y-6 px-4 pt-4">
          {/* Title, badges, region */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {isReserved && (
                <Badge variant="secondary" className="font-medium">
                  Rezervované
                </Badge>
              )}
              {isSold && (
                <Badge variant="secondary" className="font-medium">
                  Predané
                </Badge>
              )}
              {listing.type === "auction" && (
                <Badge variant="default" className="gap-0.5">
                  <Gavel className="size-3" aria-hidden />
                  Aukcia
                </Badge>
              )}
              {listing.swap_enabled && (
                <Badge variant="secondary" className="gap-0.5">
                  <ArrowLeftRight className="size-3" aria-hidden />
                  Výmena
                </Badge>
              )}
              {listing.category === "accessory" && (
                <Badge variant="outline">Príslušenstvo</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-tight">
              {listing.plant_name}
            </h1>
            <p className="text-muted-foreground flex items-center gap-1 text-sm">
              <MapPin className="size-3.5" aria-hidden />
              {getRegionShortLabel(listing.region)}
              {listing.district ? `, ${listing.district}` : ""}
            </p>
          </div>

          {/* Price area */}
          <ListingPriceBlock
            type={listing.type}
            fixedPrice={listing.fixed_price}
            currentBid={listing.current_bid}
            auctionStartPrice={listing.auction_start_price}
            bidCount={listing.bid_count}
            auctionEndsAt={listing.auction_ends_at}
            auctionEnded={auctionEnded}
          />

          {!isFixed && auctionEnded && (
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
              Aukcia skončila
            </div>
          )}

          {/* Reactions bar */}
          <ListingReactionsBar
            listingId={listing.id}
            reactionCounts={listing.reaction_counts}
            myReaction={listing.my_reaction}
            isAuthenticated={isAuthenticated}
          />

          {/* Seller card */}
          <section aria-label="Predajca">
            <ListingSellerBlock
              seller={listing.seller}
              listingId={listing.id}
              isOwnListing={isOwnListing}
              isAuthenticated={isAuthenticated}
            />
          </section>

          {/* Details accordion */}
          <ListingDetailsAccordion
            condition={listing.condition}
            size={listing.size}
            leafCount={listing.leaf_count}
            notes={listing.notes}
            region={listing.region}
            district={listing.district}
            createdAt={listing.created_at}
          />

          {/* Safety tip */}
          <SafetyTipBox />

          {/* Swap section */}
          <ListingSwapSection swapEnabled={listing.swap_enabled} />
        </div>
      </main>

      {/* Sticky CTA bar */}
      <ListingCtaBar
        listingId={listing.id}
        isOwnListing={isOwnListing}
        isAuthenticated={isAuthenticated}
        isAuction={!isFixed}
        auctionEnded={auctionEnded}
        status={listing.status}
        isAuctionWinner={isAuctionWinner}
        auctionStartPrice={listing.auction_start_price ?? undefined}
        auctionMinIncrement={listing.auction_min_increment ?? undefined}
        auctionEndsAt={listing.auction_ends_at}
        currentBid={listing.current_bid}
        bidCount={listing.bid_count}
      />
    </div>
  );
}
