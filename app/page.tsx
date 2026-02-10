import Link from "next/link";

import { FeedFilters } from "@/components/feed/feed-filters";
import { FeedHomeSections } from "@/components/feed/feed-home-sections";
import { LoadMoreButton } from "@/components/feed/load-more-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  getListingsFeed,
  type FeedFilters as ListingFeedFilters,
} from "@/lib/data/listings";
import { getUser } from "@/lib/auth";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type HomeFeedType = "all" | "fixed" | "auction";
type HomeSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "trending"
  | "ending_soon"
  | "auction_newest";

type HomeFilters = {
  region: string;
  district?: string;
  query?: string;
  page: number;
  sort: HomeSort;
  type: HomeFeedType;
  swap_enabled: boolean;
  verified_seller: boolean;
  category?: "plant" | "accessory";
  price_min?: number;
  price_max?: number;
  auction_ends_within_hours?: number;
  auction_min_bid?: number;
  min_photos?: number;
  condition?: string;
  size?: "S" | "M" | "L";
};

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): HomeFilters {
  const str = (key: string) => {
    const value = raw[key];
    return typeof value === "string" ? value : undefined;
  };

  const parseNumber = (key: string) => {
    const value = str(key);
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return parsed;
  };

  const typeRaw = str("type");
  const type: HomeFeedType =
    typeRaw === "fixed" || typeRaw === "auction" ? typeRaw : "all";

  const sortRaw = str("sort");
  const sort: HomeSort =
    type === "auction"
      ? sortRaw === "auction_newest" || sortRaw === "ending_soon"
        ? sortRaw
        : "ending_soon"
      : sortRaw === "price_asc" ||
          sortRaw === "price_desc" ||
          sortRaw === "trending" ||
          sortRaw === "newest"
        ? sortRaw
        : "newest";

  const categoryRaw = str("category");
  const category = categoryRaw === "accessory" ? "accessory" : undefined;

  const sizeRaw = str("size");
  const size: "S" | "M" | "L" | undefined =
    sizeRaw === "S" || sizeRaw === "M" || sizeRaw === "L" ? sizeRaw : undefined;

  return {
    region: str("region") || "",
    district: str("district") || undefined,
    query: str("q") || undefined,
    page: str("page") ? Number(str("page")) : 1,
    sort,
    type,
    swap_enabled: str("swap") === "1",
    verified_seller: str("verified") === "1",
    category,
    price_min: parseNumber("priceMin"),
    price_max: parseNumber("priceMax"),
    auction_ends_within_hours: parseNumber("auctionEnds"),
    auction_min_bid: parseNumber("auctionMinBid"),
    min_photos: str("minPhotos") === "3" ? 3 : undefined,
    condition: str("condition") || undefined,
    size,
  };
}

function toListingFilters(filters: HomeFilters): ListingFeedFilters {
  const listingType =
    filters.type === "fixed" || filters.type === "auction"
      ? filters.type
      : undefined;

  return {
    region: filters.region || undefined,
    district: filters.district,
    query: filters.query,
    page: filters.page,
    type: listingType,
    sort: filters.sort,
    swap_enabled: filters.swap_enabled || undefined,
    verified_seller: filters.verified_seller || undefined,
    category: filters.category,
    price_min: filters.price_min,
    price_max: filters.price_max,
    auction_ends_within_hours: filters.auction_ends_within_hours,
    auction_min_bid: filters.auction_min_bid,
    min_photos: filters.min_photos,
    condition: filters.condition,
    size: filters.size,
  };
}

function hasStrictFilters(filters: HomeFilters): boolean {
  if (filters.query?.trim()) return true;
  if (filters.type !== "all") return true;
  if (filters.swap_enabled) return true;
  if (filters.verified_seller) return true;
  if (filters.category) return true;
  if (filters.price_min != null || filters.price_max != null) return true;
  if (filters.district) return true;
  if (filters.sort !== "newest") return true;
  if (filters.auction_ends_within_hours != null || filters.auction_min_bid != null) return true;
  if (filters.min_photos != null) return true;
  if (filters.condition || filters.size) return true;
  return false;
}

function getClearFiltersHref(filters: HomeFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);
  const currentUser = await getUser();
  const userId = currentUser?.id ?? null;

  const baseFilters = toListingFilters(filters);
  const feedData = await Promise.all([
    getListingsFeed(baseFilters, userId),
    getListingsFeed(
      {
        ...baseFilters,
        page: 1,
        sort: "trending",
      },
      userId
    ),
    filters.type === "fixed"
      ? Promise.resolve({ listings: [], hasMore: false })
      : getListingsFeed(
          {
            ...baseFilters,
            page: 1,
            type: "auction",
            sort: "ending_soon",
          },
          userId
        ),
  ]).catch(() => null);

  if (!feedData) {
    const params = new URLSearchParams();
    Object.entries(rawParams).forEach(([key, value]) => {
      if (typeof value === "string") params.set(key, value);
    });
    const href = params.toString() ? `/?${params.toString()}` : "/";

    return (
      <div className="space-y-4">
        <FeedFilters />
        <EmptyState
          title="Ups, niečo sa pokazilo"
          description="Skús to ešte raz."
          action={
            <Button asChild className="min-h-[44px]">
              <Link href={href}>Obnoviť</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [mainFeed, trendingFeed, endingSoonFeed] = feedData;
  const strictFilters = hasStrictFilters(filters);
  const hasRegion = Boolean(filters.region);
  const isEmpty = mainFeed.listings.length === 0;

  return (
    <div className="space-y-4">
      <div id="home-filters">
        <FeedFilters resultsCount={mainFeed.listings.length} />
      </div>

      {isEmpty ? (
        strictFilters ? (
          <EmptyState
            title="Nič sme nenašli"
            description="Skús uvoľniť filtre alebo prepnúť typ."
            action={
              <div className="flex w-full max-w-xs flex-col gap-2">
                <Button asChild className="min-h-[44px] w-full">
                  <Link href="#home-filters">Upraviť filtre</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-[44px] w-full">
                  <Link href={getClearFiltersHref(filters)}>Vymazať filtre</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <EmptyState
            title="Zatiaľ tu nič nie je 🌱"
            description={
              hasRegion
                ? "Buď prvý, kto pridá ponuku, ľudia v tvojom kraji to uvidia hneď."
                : "Vyber svoj kraj alebo pridaj prvú ponuku v komunite."
            }
            action={
              <div className="flex w-full max-w-xs flex-col gap-2">
                <Button asChild className="min-h-[44px] w-full">
                  <Link href="/create">Pridať inzerát</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-[44px] w-full">
                  <Link href="/">Skúsiť iný kraj</Link>
                </Button>
              </div>
            }
          />
        )
      ) : (
        <FeedHomeSections
          trendingInRegion={trendingFeed.listings.slice(0, 8)}
          endingSoon={endingSoonFeed.listings.slice(0, 8)}
          forceEndingSoonSection={filters.type === "auction"}
          mainListings={mainFeed.listings}
          hasMore={mainFeed.hasMore}
          isAuthenticated={!!currentUser}
          loadMoreSlot={<LoadMoreButton />}
        />
      )}
    </div>
  );
}
