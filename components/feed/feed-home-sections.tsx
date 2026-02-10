"use client";

import { FeedListingCardComponent } from "@/components/feed/feed-listing-card";
import { AuthPromptBanner } from "@/components/feed/auth-prompt-banner";
import type { FeedListingCard } from "@/lib/data/listings";

type FeedHomeSectionsProps = {
  trendingInRegion: FeedListingCard[];
  endingSoon: FeedListingCard[];
  forceEndingSoonSection?: boolean;
  mainListings: FeedListingCard[];
  hasMore: boolean;
  isAuthenticated: boolean;
  loadMoreSlot: React.ReactNode;
};

export function FeedHomeSections({
  trendingInRegion,
  endingSoon,
  forceEndingSoonSection = false,
  mainListings,
  hasMore,
  isAuthenticated,
  loadMoreSlot,
}: FeedHomeSectionsProps) {
  const showTrending = trendingInRegion.length > 0;
  const showEndingSoon = forceEndingSoonSection || endingSoon.length > 0;

  return (
    <div className="space-y-6">
      {/* A) Trending */}
      {showTrending && (
        <section aria-label="Trending v tvojom kraji" className="space-y-1.5">
          <h2 className="text-sm font-semibold">🔥 Trending v tvojom kraji</h2>
          <p className="text-muted-foreground text-xs">
            Tieto kúsky teraz letia, nezmeškaj ich.
          </p>
          <div
            className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
          >
            {trendingInRegion.map((listing) => (
              <div
                key={listing.id}
                className="w-[188px] shrink-0 snap-start"
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

      {/* B) Končí čoskoro */}
      {showEndingSoon && (
        <section aria-label="Končí čoskoro" className="space-y-1.5">
          <h2 className="text-sm font-semibold">⏳ Končí čoskoro</h2>
          <p className="text-muted-foreground text-xs">
            Aukcie, ktoré sa môžu skončiť každú chvíľu.
          </p>
          <div
            className="flex items-stretch gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
          >
            {endingSoon.length > 0 ? (
              endingSoon.map((listing) => (
                <div
                  key={listing.id}
                  className="w-[188px] shrink-0"
                  role="listitem"
                >
                  <FeedListingCardComponent
                    listing={listing}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">
                Zatiaľ tu nie sú aktívne aukcie.
              </p>
            )}
          </div>
        </section>
      )}

      {/* C) Main feed */}
      <section aria-label="Nové prírastky" className="space-y-1.5">
        <h2 className="text-sm font-semibold">Nové prírastky</h2>
        <p className="text-muted-foreground text-xs">Pridávané práve teraz.</p>
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
