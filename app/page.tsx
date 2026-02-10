import { Suspense } from "react";
import Link from "next/link";

import { FeedFilters } from "@/components/feed/feed-filters";
import { FeedHomeSections } from "@/components/feed/feed-home-sections";
import { FeedHomeSkeleton } from "@/components/feed/feed-home-skeleton";
import { LoadMoreButton } from "@/components/feed/load-more-button";
import {
  getListingsFeed,
  type FeedFilters as FeedFiltersType,
} from "@/lib/data/listings";
import { getUser } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/data/profile";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): FeedFiltersType {
  const str = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v : undefined;
  };

  return {
    region: str("region") || "All Slovakia",
    type: str("type") as FeedFiltersType["type"],
    swap_enabled: str("swap") === "1" ? true : undefined,
    category: str("category") as FeedFiltersType["category"],
    price_min: str("price_min") ? Number(str("price_min")) : undefined,
    price_max: str("price_max") ? Number(str("price_max")) : undefined,
    query: str("q"),
    sort: (str("sort") as FeedFiltersType["sort"]) || "newest",
    page: str("page") ? Number(str("page")) : 1,
    verified_seller: str("verified") === "1" ? true : undefined,
  };
}

const TRENDING_LIMIT = 8;
const ENDING_SOON_LIMIT = 6;

export default async function HomePage({ searchParams }: HomePageProps) {
  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);
  const currentUser = await getUser();
  const userId = currentUser?.id ?? null;
  const profile = currentUser ? await getProfileByUserId(currentUser.id) : null;

  const regionForTrending = filters.region ?? profile?.region ?? "All Slovakia";

  const [mainFeed, trendingResult, endingSoonResult] = await Promise.all([
    getListingsFeed(filters, userId),
    getListingsFeed(
      {
        sort: "trending",
        region: regionForTrending,
        page: 1,
      },
      userId
    ).then((r) => r.listings.slice(0, TRENDING_LIMIT)),
    getListingsFeed(
      {
        sort: "ending_soon",
        region: filters.region,
        page: 1,
      },
      userId
    ).then((r) => r.listings.slice(0, ENDING_SOON_LIMIT)),
  ]);

  const { listings: mainListings, hasMore } = mainFeed;
  const showTrending =
    trendingResult.length > 0 && !filters.query && filters.sort !== "trending";

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <FeedFilters />
      </Suspense>

      <Suspense fallback={<FeedHomeSkeleton />}>
        {mainListings.length === 0 &&
        trendingResult.length === 0 &&
        endingSoonResult.length === 0 ? (
          <EmptyState
            title="Zatiaľ nič v tomto kraji."
            description="Skúste zmeniť kraj alebo filtre a pozrite si viac inzerátov."
            action={
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/">
                  <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
                  Zmeniť filtre
                </Link>
              </Button>
            }
          />
        ) : (
          <FeedHomeSections
            trendingInRegion={showTrending ? trendingResult : []}
            endingSoon={endingSoonResult}
            mainListings={mainListings}
            hasMore={hasMore}
            isAuthenticated={!!currentUser}
            loadMoreSlot={
              <Suspense>
                <LoadMoreButton />
              </Suspense>
            }
          />
        )}
      </Suspense>
    </div>
  );
}
