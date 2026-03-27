import Image from "next/image";
import Link from "next/link";
import { Rubik } from "next/font/google";

import { HomeBottomNav } from "@/components/home/home-bottom-nav";
import { AuctionCountdown } from "@/components/home/auction-countdown";
import { SaveListingButton } from "@/components/listing/save-listing-button";
import { HomeFiltersDrawer } from "@/components/feed/home-filters-drawer";
import {
  getListingsFeed,
  type FeedFilters as ListingFeedFilters,
  type FeedListingCard,
} from "@/lib/data/listings";
import { getUser } from "@/lib/auth";
import { formatPrice } from "@/lib/formatters";

const rubik = Rubik({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
});

const NEW_CARD_PLACEHOLDERS = [
  "/figma-home/ph-new-1.png",
  "/figma-home/ph-new-2.png",
  "/figma-home/ph-new-3.png",
  "/figma-home/ph-new-4.png",
];
const AUCTION_CARD_PLACEHOLDER = "/figma-home/ph-auction.png";

function AppFixedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#f2ede2]">
      <div
        className="absolute inset-0 bg-repeat [background-position:center_top]"
        style={{
          backgroundImage: "url('/figma-home/bg-4695.svg')",
          backgroundSize: "921.705px 702.87px",
        }}
      />
    </div>
  );
}

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
  const category =
    categoryRaw === "plant" || categoryRaw === "accessory"
      ? categoryRaw
      : undefined;

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

function firstSellerName(name: string | null) {
  return name?.trim().split(/\s+/)[0] || "Predajca";
}

function formatRegionWithKraj(region: string) {
  const value = region.trim();
  if (!value) return "Slovensko";
  if (value.toLowerCase().includes("kraj")) return value;
  return `${value} kraj`;
}

function cardImage(listing: FeedListingCard, index: number, auction = false) {
  if (listing.first_photo_url) return listing.first_photo_url;
  if (auction) return AUCTION_CARD_PLACEHOLDER;
  return NEW_CARD_PLACEHOLDERS[index % NEW_CARD_PLACEHOLDERS.length];
}

function SectionLabel({
  iconSrc,
  label,
  count,
}: {
  iconSrc: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex h-[21px] items-center gap-[7px]">
      <Image src={iconSrc} alt="" width={18} height={18} className="size-[17.5px]" />
      <p className="text-[12px] font-medium leading-[21px] tracking-[0.04em] text-[#232711] uppercase">
        {label}
      </p>
      <p className="text-[12.25px] leading-[17.5px] text-[#c8c2b4]">({count})</p>
    </div>
  );
}

function NewListingCard({
  listing,
  index,
  isAuthenticated,
}: {
  listing: FeedListingCard;
  index: number;
  isAuthenticated: boolean;
}) {
  const pill =
    listing.category === "accessory"
      ? {
          text: "Odrezok",
          textClass: "text-[#4f5826]",
          bgClass: "bg-[#c4c35b]",
        }
      : {
          text: "Rastlina",
          textClass: "text-[#c4c35b]",
          bgClass: "bg-[#4f5826]",
        };

  return (
    <div className="relative overflow-hidden rounded-[14px] bg-[#faf8f4] shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
      <Link
        href={`/listing/${listing.id}`}
        aria-label={listing.plant_name}
        className="absolute inset-0 z-10"
      />
      <div className="relative h-[167.75px] overflow-hidden p-[10px]">
        <Image
          fill
          src={cardImage(listing, index)}
          alt={listing.plant_name}
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 182px"
        />
        <span
          className={`relative z-10 inline-flex items-center rounded-[8px] px-[6px] py-[4px] text-[10px] leading-[14px] ${pill.bgClass} ${pill.textClass}`}
        >
          {pill.text}
        </span>
        {isAuthenticated ? (
          <div className="absolute right-[10px] top-[10px] z-20">
            <SaveListingButton
              listingId={listing.id}
              isSaved={listing.is_saved ?? false}
              isAuthenticated={isAuthenticated}
              variant="icon"
              className="size-9 rounded-[14px] border-0 bg-[#faf8f4]/95 text-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-[5.25px] p-[10px] text-[#232711]">
        <div>
          <div className="flex h-[14px] items-center gap-[3.5px]">
            <Image
              src="/figma-home/location-new.svg"
              alt=""
              width={11}
              height={11}
              className="size-[10.5px]"
            />
            <span className="text-[10px] leading-[14px] text-[#5a6e5a]">{listing.region}</span>
          </div>
          <p className="w-full truncate text-[12px] font-medium leading-[21px]">{listing.plant_name}</p>
        </div>

        <p className="text-[16px] font-semibold leading-[20px]">
          {listing.fixed_price != null ? formatPrice(listing.fixed_price) : "Dohodou"}
        </p>

        <div className="flex items-center justify-between rounded-[8px] bg-[#f6f3ed] px-[7px] py-[5px]">
          <span className="text-[10px] leading-[14px] text-[#5a6e5a]">
            {firstSellerName(listing.seller_display_name)}
          </span>
          <span className="flex items-center gap-[1.75px] text-[10px] leading-[17.5px]">
            <Image src="/figma-home/star-new.svg" alt="" width={11} height={11} className="size-[10.5px]" />
            <span className="font-bold text-[#232711]">5</span>
            <span className="text-[#c8c2b4]">({listing.seller_ratings_count || 1})</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function AuctionListingCard({
  listing,
  index,
  isAuthenticated,
}: {
  listing: FeedListingCard;
  index: number;
  isAuthenticated: boolean;
}) {
  const current = listing.current_bid ?? listing.auction_start_price;

  return (
    <div className="relative overflow-hidden rounded-[14px] bg-[#faf8f4] shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
      <Link
        href={`/listing/${listing.id}`}
        aria-label={listing.plant_name}
        className="absolute inset-0 z-10"
      />
      <div className="relative h-[167.75px] overflow-hidden p-[10px]">
        <Image
          fill
          src={cardImage(listing, index, true)}
          alt={listing.plant_name}
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 182px"
        />
        <span className="relative z-10 inline-flex items-center gap-[3.5px] rounded-[8px] bg-[#f7a9ae] px-[6px] py-[4px] text-[10px] leading-[14px] text-[#6d4a4d]">
          <Image
            src="/figma-home/auction-3011-clock.svg"
            alt=""
            width={11}
            height={11}
            className="size-[10.5px]"
          />
          <AuctionCountdown endsAt={listing.auction_ends_at} />
        </span>
        {isAuthenticated ? (
          <div className="absolute right-[10px] top-[10px] z-20">
            <SaveListingButton
              listingId={listing.id}
              isSaved={listing.is_saved ?? false}
              isAuthenticated={isAuthenticated}
              variant="icon"
              className="size-9 rounded-[14px] border-0 bg-[#faf8f4]/95 text-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-[5.25px] p-[10px] text-[#232711]">
        <div>
          <div className="flex h-[14px] items-center gap-[3.5px]">
            <Image
              src="/figma-home/auction-3011-location.svg"
              alt=""
              width={11}
              height={11}
              className="size-[10.5px]"
            />
            <span className="text-[10px] leading-[14px] text-[#5a6e5a]">
              {formatRegionWithKraj(listing.region)}
            </span>
          </div>
          <p className="w-full truncate text-[12px] font-medium leading-[21px]">{listing.plant_name}</p>
        </div>

        <div>
          <p className="text-[10px] leading-[14px] text-[#5a6e5a]">Aktuálne:</p>
          <p className="text-[16px] font-semibold leading-[20px]">
            {current != null ? formatPrice(current) : "-"}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-[8px] bg-[#f6f3ed] px-[7px] py-[5px]">
          <span className="text-[10px] leading-[14px] text-[#5a6e5a]">
            {firstSellerName(listing.seller_display_name)}
          </span>
          <span className="flex items-center gap-[1.75px] text-[10px] leading-[17.5px]">
            <Image
              src="/figma-home/auction-3011-star.svg"
              alt=""
              width={11}
              height={11}
              className="size-[10.5px]"
            />
            <span className="font-bold text-[#232711]">5</span>
            <span className="text-[#c8c2b4]">({listing.seller_ratings_count || 1})</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function FeedResultCard({
  listing,
  index,
  isAuthenticated,
}: {
  listing: FeedListingCard;
  index: number;
  isAuthenticated: boolean;
}) {
  if (listing.type === "auction") {
    return (
      <AuctionListingCard
        listing={listing}
        index={index}
        isAuthenticated={isAuthenticated}
      />
    );
  }
  return (
    <NewListingCard
      listing={listing}
      index={index}
      isAuthenticated={isAuthenticated}
    />
  );
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
  ]).catch(() => null);

  if (!feedData) {
    return (
      <div className={`${rubik.className} relative min-h-dvh text-[#232711]`}>
        <AppFixedBackground />
        <div className="relative z-10 px-4 py-10">
          <div className="mx-auto max-w-md rounded-[24px] bg-[#faf8f4]/94 p-6 backdrop-blur-[1px]">
            <p className="text-lg font-bold">Úvodná stránka sa nepodarila načítať</p>
            <p className="mt-2 text-sm text-[#5a6e5a]">Skús obnoviť stránku ešte raz.</p>
          </div>
        </div>
      </div>
    );
  }

  const [mainFeed, trendingFeed] = feedData;
  const strictFilters = hasStrictFilters(filters);
  const featuredListings = trendingFeed.listings.slice(0, 4);
  const newestListings = mainFeed.listings.slice(0, 4);
  const filteredListings = mainFeed.listings;

  const chips = [
    { label: "Monstera", href: "/?q=Monstera" },
    { label: "Philodendron", href: "/?q=Philodendron" },
    { label: "Hoya", href: "/?q=Hoya" },
    { label: "Anthurium", href: "/?q=Anthurium" },
    { label: "Alocasia", href: "/?q=Alocasia" },
    { label: "Syngonium", href: "/?q=Syngonium" },
    { label: "Pothos", href: "/?q=Pothos" },
    { label: "Scindapsus", href: "/?q=Scindapsus" },
    { label: "Calathea", href: "/?q=Calathea" },
    { label: "Begonia", href: "/?q=Begonia" },
    { label: "Orchid", href: "/?q=Orchid" },
    { label: "Ficus", href: "/?q=Ficus" },
    { label: "Cactus", href: "/?q=Cactus" },
    { label: "Sukulenty", href: "/?q=Sukulenty" },
  ];
  const searchHref = filters.query ? `/search?q=${encodeURIComponent(filters.query)}` : "/search";

  return (
    <div className={`${rubik.className} relative min-h-dvh text-[#232711]`}>
      <AppFixedBackground />
      <div className="relative z-10 mx-auto w-full max-w-md pb-[5.6rem]">
        <header className="px-[14px] py-[10px]">
          <div className="flex justify-center py-[2px]">
            <Link href="/" aria-label="Rootie">
              <Image
                src="/figma-home/logo.svg"
                alt="Rootie"
                width={104}
                height={31}
                priority
                className="h-[31px] w-[104px]"
              />
            </Link>
          </div>

          <div className="mt-[10.5px] flex items-center gap-[10px]">
            <Link
              href={searchHref}
              className="flex h-[44px] flex-1 items-center gap-[6px] rounded-[18px] border-2 border-[#c4c35b]/20 bg-[#faf8f4] px-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
              aria-label="Otvoriť hľadanie rastlín"
            >
              <Image src="/figma-home/search.svg" alt="" width={18} height={18} className="size-[18px]" />
              <span
                className={`w-full text-[14px] leading-normal ${
                  filters.query ? "text-[#232711]" : "text-[#878379]"
                }`}
              >
                {filters.query?.trim() ? filters.query : "Hľadať rastliny..."}
              </span>
            </Link>
            <HomeFiltersDrawer />
          </div>

          <div className="-mx-[14px] mt-[10.5px] flex items-center gap-[8.75px] overflow-x-auto overflow-y-hidden pl-[14px] pr-[14px] pb-[2px] whitespace-nowrap touch-pan-x snap-x snap-mandatory scroll-pl-[14px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => {
              const active = filters.query === chip.label;
              return (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="shrink-0 snap-start rounded-[18px] bg-[#faf8f4] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
                >
                  <span className="flex items-center gap-[6px] p-[8px]">
                    <span className="flex size-[38px] items-center justify-center rounded-full bg-[#f1ece1] p-[2px]">
                      <Image
                        src="/figma-home/chip-21404-icon.svg"
                        alt=""
                        width={23}
                        height={23}
                        className="size-[23px]"
                      />
                    </span>
                    <span
                      className={`text-center text-[12px] font-medium leading-[21px] ${
                        active ? "text-[#4f5826]" : "text-[#232711]"
                      }`}
                    >
                      {chip.label}
                    </span>
                  </span>
                </Link>
              );
            })}
            {strictFilters ? (
              <Link
                href={getClearFiltersHref(filters)}
                className="inline-flex h-[54px] shrink-0 snap-start items-center rounded-[18px] bg-[#f6f3ed] px-[14px] text-[12px] font-medium leading-[21px] text-[#4f5826]"
              >
                Reset
              </Link>
            ) : null}
          </div>
        </header>

        <main className="space-y-[12px]">
          {strictFilters ? (
            filteredListings.length > 0 ? (
              <section className="space-y-[12px] px-[14px] py-[10px]">
                <SectionLabel
                  iconSrc="/figma-home/section-new.svg"
                  label="Výsledky filtrovania"
                  count={filteredListings.length}
                />
                <div className="grid grid-cols-2 gap-[10.5px]">
                  {filteredListings.map((listing, index) => (
                    <FeedResultCard
                      key={listing.id}
                      listing={listing}
                      index={index}
                      isAuthenticated={Boolean(currentUser)}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="px-[14px] py-[10px]">
                <div className="rounded-[14px] bg-[#faf8f4] p-5 text-center shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                  <p className="text-[16px] font-semibold leading-[21px] text-[#232711]">
                    Nenašli sa žiadne výsledky
                  </p>
                  <p className="mt-1 text-[13px] leading-[18px] text-[#5a6e5a]">
                    Skús upraviť filtre alebo použiť Reset.
                  </p>
                </div>
              </section>
            )
          ) : (
            <>
              {featuredListings.length > 0 ? (
                <section className="space-y-[12px] px-[14px] py-[10px]">
                  <SectionLabel
                    iconSrc="/figma-home/trending-391-icon.svg"
                    label="Trending v tvojom kraji"
                    count={featuredListings.length}
                  />
                  <div className="grid grid-cols-2 gap-[10.5px]">
                    {featuredListings.map((listing, index) => (
                      <NewListingCard
                        key={listing.id}
                        listing={listing}
                        index={index}
                        isAuthenticated={Boolean(currentUser)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {!currentUser ? (
                <section className="px-[14px] py-[2px]">
                  <Link
                    href="/signup"
                    className="relative flex h-[135px] items-center gap-[14px] overflow-hidden rounded-[14px] bg-[#c4c35b] p-[17.5px] text-[#4f5826]"
                  >
                    <Image
                      src="/figma-home/cta-3364-bg-bottom.svg"
                      alt=""
                      width={415.5}
                      height={170.666}
                      className="pointer-events-none absolute left-[-34px] top-[69.36px] h-[170.666px] w-[415.5px] max-w-none"
                    />
                    <Image
                      src="/figma-home/cta-3364-bg-top.svg"
                      alt=""
                      width={415.5}
                      height={170.666}
                      className="pointer-events-none absolute left-[-34px] top-[-111.64px] h-[170.666px] w-[415.5px] max-w-none rotate-180"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[19px] font-bold leading-[21px]">Vytvor si účet zadarmo</p>
                      <p className="mt-[3.5px] text-[14px] leading-[16.844px]">
                        Ukladaj obľúbené rastliny a komunikuj
                        <br />
                        s predajcami
                      </p>
                    </div>
                    <Image
                      src="/figma-home/cta-3364-arrow.svg"
                      alt=""
                      width={37}
                      height={37}
                      className="relative z-10 size-[37px] shrink-0"
                    />
                  </Link>
                </section>
              ) : null}

              {newestListings.length > 0 ? (
                <section className="space-y-[12px] px-[14px] py-[10px]">
                  <SectionLabel
                    iconSrc="/figma-home/section-new.svg"
                    label="Nové prírastky"
                    count={newestListings.length}
                  />
                  <div className="grid grid-cols-2 gap-[10.5px]">
                    {newestListings.map((listing, index) => (
                      <NewListingCard
                        key={listing.id}
                        listing={listing}
                        index={index + 1}
                        isAuthenticated={Boolean(currentUser)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {featuredListings.length === 0 && newestListings.length === 0 ? (
                <section className="px-[14px] py-[10px]">
                  <div className="rounded-[14px] bg-[#faf8f4] p-5 text-center shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                    <p className="text-[16px] font-semibold leading-[21px] text-[#232711]">
                      Momentálne tu nič nie je
                    </p>
                    <p className="mt-1 text-[13px] leading-[18px] text-[#5a6e5a]">
                      Skús zmeniť vyhľadávanie alebo sa vráť neskôr.
                    </p>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>

      <HomeBottomNav isAuthenticated={Boolean(currentUser)} />
    </div>
  );
}
