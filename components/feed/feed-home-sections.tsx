"use client";

import { FeedListingCardComponent } from "@/components/feed/feed-listing-card";
import { AuthPromptBanner } from "@/components/feed/auth-prompt-banner";
import type { FeedListingCard } from "@/lib/data/listings";

type FeedHomeSectionsProps = {
  trendingInRegion: FeedListingCard[];
  endingSoon: FeedListingCard[];
  mainListings: FeedListingCard[];
  hasMore: boolean;
  isAuthenticated: boolean;
  loadMoreSlot: React.ReactNode;
};

export function FeedHomeSections({
  trendingInRegion,
  endingSoon,
  mainListings,
  hasMore,
  isAuthenticated,
  loadMoreSlot,
}: FeedHomeSectionsProps) {
  const showTrending = trendingInRegion.length > 0;
  const showEndingSoon = endingSoon.length > 0;

  return (
    <div className="space-y-6">
      {/* A) Trending v kraji — carousel, jedna karta na „stránku“ */}
      {showTrending && (
        <section aria-label="Trending v kraji">
          <h2 className="mb-2 text-sm font-semibold">Trending v kraji</h2>
          <div
            className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
          >
            {trendingInRegion.map((listing) => (
              <div
                key={listing.id}
                className="w-[160px] shrink-0 snap-start sm:w-[180px]"
                role="listitem"
              >
                <FeedListingCardComponent
                  listing={listing}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Auth prompt — between trending and rest, only for guests */}
      {!isAuthenticated && <AuthPromptBanner />}

      {/* B) Končí čoskoro — horizontal scroll */}
      {showEndingSoon && (
        <section aria-label="Končí čoskoro">
          <h2 className="mb-2 text-sm font-semibold">Končí čoskoro</h2>
          <div
            className="flex items-stretch gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
          >
            {endingSoon.map((listing) => (
              <div
                key={listing.id}
                className="w-[160px] shrink-0 sm:w-[180px]"
                role="listitem"
              >
                <FeedListingCardComponent
                  listing={listing}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* C) Nové prírastky — grid */}
      <section aria-label="Nové prírastky">
        <h2 className="mb-2 text-sm font-semibold">Nové prírastky</h2>
        {mainListings.length === 0 ? null : (
          <>
            <div className="grid grid-cols-2 gap-3" role="list">
              {mainListings.map((listing) => (
                <FeedListingCardComponent
                  key={listing.id}
                  listing={listing}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
            {hasMore && loadMoreSlot}
          </>
        )}
      </section>
    </div>
  );
}
