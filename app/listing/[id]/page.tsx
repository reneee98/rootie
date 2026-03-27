import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Ruler,
  Tag,
} from "lucide-react";

import { PhotoGallery } from "@/components/listing/photo-gallery";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { ListingBackButton } from "@/components/listing/listing-back-button";
import { ListingReportButton } from "@/components/listing/listing-report-button";
import { ListingSellerBlock } from "@/components/listing/listing-seller-block";
import { SafetyTipBox } from "@/components/listing/safety-tip-box";
import { ListingCtaBar } from "@/components/listing/listing-cta-bar";
import { getListingDetail } from "@/lib/data/listings";
import { getUser } from "@/lib/auth";
import { formatPrice } from "@/lib/formatters";
import { getConditionLabel, getSizeLabel } from "@/lib/listing-labels";
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
  const locationLabel = listing.district
    ? `${getRegionShortLabel(listing.region)}, ${listing.district}`
    : getRegionShortLabel(listing.region);
  const displayPrice = isFixed
    ? listing.fixed_price != null
      ? formatPrice(listing.fixed_price)
      : "Dohodou"
    : formatPrice(listing.current_bid ?? listing.auction_start_price ?? 0);
  const priceMeta = isFixed
    ? null
    : listing.current_bid != null
      ? `Aktuálna cena • ${listing.bid_count} ${
          listing.bid_count === 1 ? "príhoz" : listing.bid_count < 5 ? "príhozy" : "príhozov"
        }`
      : "Začiatočná cena aukcie";
  const conditionLabel = listing.condition
    ? getConditionLabel(listing.condition)
    : "Neuvedené";
  const sizeLabel = listing.size ? getSizeLabel(listing.size) : "Neuvedené";
  const createdLabel = new Date(listing.created_at).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-dvh bg-[#faf8f4] pb-28">
      <main className="mx-auto max-w-md">
        <div className="relative">
          <PhotoGallery
            photos={listing.photos}
            alt={listing.plant_name}
            frameClassName="h-[60vh]"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
          <ListingBackButton className="absolute left-4 top-[19px]" />
          <ListingReportButton
            listingId={listing.id}
            isOwnListing={isOwnListing}
            isAuthenticated={isAuthenticated}
            className="absolute right-4 top-[19px]"
          />
          <div className="absolute bottom-5 right-4">
            <SaveListingButton
              listingId={listing.id}
              isSaved={listing.is_saved}
              initialSaveCount={listing.save_count}
              isAuthenticated={isAuthenticated}
              variant="icon"
              showCount
              className="h-[44px] min-w-[44px] gap-1.5 rounded-[18px] border-0 bg-[#faf8f4] px-3 text-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-[3px]">
          <section className="mx-3 border-b border-[rgba(0,0,0,0.06)] px-[14px] pb-[12px] pt-[12px]">
            <p className="flex items-center gap-[5px] text-[12.25px] leading-[17.5px] text-[#5a6e5a]">
              <MapPin className="size-[14px]" aria-hidden />
              {locationLabel}
            </p>
            <h1 className="mt-1.5 text-[17px] font-medium leading-[23px] text-[#1a2e1a]">
              {listing.plant_name}
            </h1>
            <p className="mt-1 text-[22px] font-semibold leading-[24px] text-[#232711]">
              {displayPrice}
            </p>
            {priceMeta ? (
              <p className="mt-0.5 text-[12px] leading-[16px] text-[#5a6e5a]">{priceMeta}</p>
            ) : null}
            {auctionEnded ? (
              <p className="mt-0.5 text-[12px] leading-[16px] text-[#6d4a4d]">Aukcia skončila</p>
            ) : null}
          </section>

          <section className="mx-3 border-b border-[rgba(0,0,0,0.06)] px-[14px] pb-[12px] pt-[12px]">
            <h2 className="text-[13px] font-semibold leading-[18px] text-[#232711]">Informácie</h2>
            <div className="mt-2.5 grid grid-cols-2 gap-x-2.5 gap-y-2.5">
              <div className="flex gap-[8.75px]">
                <Tag className="mt-[1px] size-[14px] text-[#5a6e5a]" aria-hidden />
                <div>
                  <p className="text-[11.5px] leading-[15px] text-[#5a6e5a]">Stav</p>
                  <p className="text-[13px] font-semibold leading-[16px] text-[#1a2e1a]">{conditionLabel}</p>
                </div>
              </div>
              <div className="flex gap-[8.75px]">
                <Ruler className="mt-[1px] size-[14px] text-[#5a6e5a]" aria-hidden />
                <div>
                  <p className="text-[11.5px] leading-[15px] text-[#5a6e5a]">Veľkosť</p>
                  <p className="text-[13px] font-semibold leading-[16px] text-[#1a2e1a]">{sizeLabel}</p>
                </div>
              </div>
              <div className="col-span-2 flex gap-[8.75px]">
                <Calendar className="mt-[1px] size-[14px] text-[#5a6e5a]" aria-hidden />
                <div>
                  <p className="text-[11.5px] leading-[15px] text-[#5a6e5a]">Pridané</p>
                  <p className="text-[13px] font-semibold leading-[16px] text-[#1a2e1a]">{createdLabel}</p>
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Predajca" className="mx-3 px-[14px] pb-[12px] pt-[12px]">
            <h2 className="text-[13px] font-semibold leading-[18px] text-[#1a2e1a]">Predajca</h2>
            <div className="mt-2.5">
              <ListingSellerBlock seller={listing.seller} />
            </div>
          </section>

          <section className="mx-3 px-[14px] pb-[12px]">
            <SafetyTipBox />
          </section>
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
