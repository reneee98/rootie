import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { PUBLIC_LISTING_STATUS } from "@/lib/listing-lifecycle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedListingCard = {
  id: string;
  plant_name: string;
  created_at: string;
  type: "fixed" | "auction";
  swap_enabled: boolean;
  category: "plant" | "accessory";
  fixed_price: number | null;
  auction_start_price: number | null;
  auction_ends_at: string | null;
  region: string;
  first_photo_url: string | null;
  seller_phone_verified: boolean;
  seller_avatar_url: string | null;
  seller_ratings_avg: number | null;
  seller_ratings_count: number;
  /** Predajcovo zobrazené meno (pre mini-badge a inicialky) */
  seller_display_name: string | null;
  bid_count: number;
  current_bid: number | null;
  photo_count: number;
  is_saved?: boolean;
};

export type ReactionType = "like" | "want" | "wow" | "funny" | "sad";

export type ReactionCounts = Record<ReactionType, number>;

export type ListingDetail = {
  id: string;
  seller_id: string;
  type: "fixed" | "auction";
  swap_enabled: boolean;
  category: "plant" | "accessory";
  plant_name: string;
  condition: string | null;
  size: string | null;
  leaf_count: number | null;
  notes: string | null;
  region: string;
  district: string | null;
  fixed_price: number | null;
  auction_start_price: number | null;
  auction_min_increment: number | null;
  auction_ends_at: string | null;
  status: string;
  created_at: string;
  photos: { id: string; url: string; position: number }[];
  seller: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    phone_verified: boolean;
    ratings_avg: number | null;
    ratings_count: number;
    region: string | null;
    /** Present only when seller opted in (show_phone_on_listing) and phone_verified */
    phone?: string | null;
  };
  bid_count: number;
  current_bid: number | null;
  reaction_count: number;
  reaction_counts: ReactionCounts;
  my_reaction: ReactionType | null;
  save_count: number;
  is_saved: boolean;
};

export type FeedFilters = {
  region?: string;
  type?: "fixed" | "auction";
  swap_enabled?: boolean;
  category?: "plant" | "accessory";
  district?: string;
  condition?: string;
  size?: "S" | "M" | "L";
  min_photos?: number;
  price_min?: number;
  price_max?: number;
  auction_ends_within_hours?: number;
  auction_min_bid?: number;
  query?: string;
  sort?:
    | "newest"
    | "ending_soon"
    | "trending"
    | "price_asc"
    | "price_desc"
    | "auction_newest";
  page?: number;
  /** When true, only listings from sellers with phone_verified */
  verified_seller?: boolean;
};

const PAGE_SIZE = 20;

type FilterableListingsQuery<T> = {
  eq: (column: string, value: unknown) => T;
  in: (column: string, values: unknown[]) => T;
  or: (filters: string) => T;
  ilike: (column: string, pattern: string) => T;
  gt: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  gte: (column: string, value: number) => T;
};

// ---------------------------------------------------------------------------
// Feed query
// ---------------------------------------------------------------------------

export async function getListingsFeed(
  filters: FeedFilters,
  userId?: string | null
): Promise<{ listings: FeedListingCard[]; hasMore: boolean }> {
  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const sort = filters.sort ?? "newest";

  let verifiedSellerIds: string[] | null = null;
  if (filters.verified_seller === true) {
    const { data: verifiedIds } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_verified", true);
    verifiedSellerIds = (verifiedIds ?? []).map((row) => row.id);
    if (verifiedSellerIds.length === 0) {
      return { listings: [], hasMore: false };
    }
  }

  const listingSelect =
    "id, plant_name, created_at, type, swap_enabled, category, fixed_price, auction_start_price, auction_ends_at, region, condition, size, district, auction_min_increment, seller:profiles!listings_seller_id_fkey ( display_name, phone_verified, avatar_url, ratings_avg, ratings_count )";

  const applyCommonFilters = <T extends FilterableListingsQuery<T>>(
    query: T,
    opts?: { skipRegion?: boolean }
  ) => {
    let q = query;

    if (!opts?.skipRegion && filters.region && filters.region !== "All Slovakia") {
      q = q.eq("region", filters.region);
    }
    if (filters.district?.trim()) {
      q = q.eq("district", filters.district.trim());
    }
    if (filters.type) {
      q = q.eq("type", filters.type);
    }
    if (filters.swap_enabled === true) {
      q = q.eq("swap_enabled", true);
    }
    if (filters.category) {
      q = q.eq("category", filters.category);
    }
    if (verifiedSellerIds && verifiedSellerIds.length > 0) {
      q = q.in("seller_id", verifiedSellerIds);
    }
    if (filters.price_min != null) {
      q = q.or(
        `fixed_price.gte.${filters.price_min},auction_start_price.gte.${filters.price_min}`
      );
    }
    if (filters.price_max != null) {
      q = q.or(
        `fixed_price.lte.${filters.price_max},auction_start_price.lte.${filters.price_max}`
      );
    }
    if (filters.query?.trim()) {
      q = q.ilike("plant_name", `%${filters.query.trim()}%`);
    }
    if (filters.condition?.trim()) {
      q = q.ilike("condition", `%${filters.condition.trim()}%`);
    }
    if (filters.size) {
      q = q.eq("size", filters.size);
    }
    if (filters.auction_min_bid != null) {
      q = q.eq("type", "auction").gte("auction_min_increment", filters.auction_min_bid);
    }
    if (filters.auction_ends_within_hours != null) {
      const now = new Date();
      const until = new Date(
        now.getTime() + filters.auction_ends_within_hours * 3_600_000
      );
      q = q
        .eq("type", "auction")
        .gt("auction_ends_at", now.toISOString())
        .lte("auction_ends_at", until.toISOString());
    }

    return q;
  };

  let listingRows: Record<string, unknown>[] = [];

  if (sort === "trending") {
    const region =
      filters.region && filters.region !== "All Slovakia"
        ? filters.region
        : null;
    let trendQ = supabase
      .from("listing_trending_scores")
      .select("listing_id")
      .eq("status", PUBLIC_LISTING_STATUS)
      .order("trending_score", { ascending: false })
      .range(from, to);
    if (region) {
      trendQ = trendQ.eq("region", region);
    }
    const { data: trendRows, error: trendErr } = await trendQ;
    if (trendErr || !trendRows?.length) {
      return { listings: [], hasMore: false };
    }

    const orderedIds = trendRows.map((row) => row.listing_id as string);
    let listQ = supabase
      .from("listings")
      .select(listingSelect)
      .eq("status", PUBLIC_LISTING_STATUS)
      .in("id", orderedIds);

    listQ = applyCommonFilters(listQ, { skipRegion: true });

    const { data, error } = await listQ;
    if (error || !data?.length) {
      return { listings: [], hasMore: false };
    }

    listingRows = (data as Record<string, unknown>[]).sort(
      (a, b) =>
        orderedIds.indexOf(a.id as string) - orderedIds.indexOf(b.id as string)
    );
  } else {
    let q = supabase
      .from("listings")
      .select(listingSelect)
      .eq("status", PUBLIC_LISTING_STATUS);
    q = applyCommonFilters(q);

    if (sort === "ending_soon") {
      q = q
        .eq("type", "auction")
        .gt("auction_ends_at", new Date().toISOString())
        .order("auction_ends_at", { ascending: true });
    } else if (sort === "auction_newest") {
      q = q.eq("type", "auction").order("created_at", { ascending: false });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    q = q.range(from, to);
    const { data, error } = await q;
    if (error || !data?.length) {
      return { listings: [], hasMore: false };
    }
    listingRows = data as Record<string, unknown>[];
  }

  const listingIds = listingRows.map((row) => row.id as string);
  const [photosRes, savedRes, bidsRes] = await Promise.all([
    supabase
      .from("listing_photos")
      .select("listing_id, url")
      .in("listing_id", listingIds)
      .order("position", { ascending: true }),
    userId
      ? supabase
          .from("saved_listings")
          .select("listing_id")
          .eq("user_id", userId)
          .in("listing_id", listingIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("bids")
      .select("listing_id, amount")
      .in("listing_id", listingIds)
      .order("amount", { ascending: false }),
  ]);

  const firstPhoto = new Map<string, string>();
  const photoCount = new Map<string, number>();
  for (const row of photosRes.data ?? []) {
    const listingId = row.listing_id as string;
    photoCount.set(listingId, (photoCount.get(listingId) ?? 0) + 1);
    if (!firstPhoto.has(listingId)) {
      firstPhoto.set(listingId, row.url);
    }
  }

  const bidStats = new Map<string, { bidCount: number; currentBid: number | null }>();
  for (const row of bidsRes.data ?? []) {
    const listingId = row.listing_id as string;
    const amount = row.amount != null ? Number(row.amount) : null;
    const current = bidStats.get(listingId);
    if (!current) {
      bidStats.set(listingId, {
        bidCount: 1,
        currentBid: amount,
      });
      continue;
    }
    current.bidCount += 1;
    if (amount != null && (current.currentBid == null || amount > current.currentBid)) {
      current.currentBid = amount;
    }
  }

  const savedSet = new Set(
    (savedRes.data ?? []).map((row) => row.listing_id as string)
  );

  const mapped: FeedListingCard[] = listingRows.map((row) => {
    const seller = row.seller as Record<string, unknown> | null;
    const listingId = row.id as string;
    const stats = bidStats.get(listingId);
    return {
      id: listingId,
      plant_name: row.plant_name as string,
      created_at: row.created_at as string,
      type: row.type as "fixed" | "auction",
      swap_enabled: Boolean(row.swap_enabled),
      category: row.category as "plant" | "accessory",
      fixed_price: row.fixed_price != null ? Number(row.fixed_price) : null,
      auction_start_price:
        row.auction_start_price != null ? Number(row.auction_start_price) : null,
      auction_ends_at: (row.auction_ends_at as string) ?? null,
      region: row.region as string,
      first_photo_url: firstPhoto.get(listingId) ?? null,
      seller_phone_verified: Boolean(seller?.phone_verified),
      seller_avatar_url: (seller?.avatar_url as string) ?? null,
      seller_ratings_avg:
        seller?.ratings_avg != null ? Number(seller.ratings_avg) : null,
      seller_ratings_count:
        seller?.ratings_count != null ? Number(seller.ratings_count) : 0,
      seller_display_name: (seller?.display_name as string) ?? null,
      bid_count: stats?.bidCount ?? 0,
      current_bid: stats?.currentBid ?? null,
      photo_count: photoCount.get(listingId) ?? 0,
      is_saved: userId ? savedSet.has(listingId) : undefined,
    };
  });

  const maybePriceSorted =
    sort === "price_asc" || sort === "price_desc"
      ? [...mapped].sort((a, b) => {
          const priceA = a.type === "fixed" ? a.fixed_price : a.current_bid ?? a.auction_start_price;
          const priceB = b.type === "fixed" ? b.fixed_price : b.current_bid ?? b.auction_start_price;
          if (priceA == null && priceB == null) return 0;
          if (priceA == null) return 1;
          if (priceB == null) return -1;
          return sort === "price_asc" ? priceA - priceB : priceB - priceA;
        })
      : mapped;

  const minPhotos = filters.min_photos ?? 0;
  const filteredByPhotoCount =
    minPhotos > 0
      ? maybePriceSorted.filter((listing) => listing.photo_count >= minPhotos)
      : maybePriceSorted;

  return {
    listings: filteredByPhotoCount,
    hasMore: listingRows.length === PAGE_SIZE,
  };
}

// ---------------------------------------------------------------------------
// Detail query
// ---------------------------------------------------------------------------

const EMPTY_REACTION_COUNTS: ReactionCounts = {
  like: 0,
  want: 0,
  wow: 0,
  funny: 0,
  sad: 0,
};

export async function getListingDetail(
  listingId: string,
  userId?: string | null
): Promise<ListingDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      `id, seller_id, type, swap_enabled, category, plant_name, condition, size, leaf_count, notes,
       region, district, fixed_price, auction_start_price, auction_min_increment, auction_ends_at,
       status, created_at`
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !listing) return null;

  const reactionCountPromise = supabase
    .from("reactions")
    .select("reaction_type")
    .eq("listing_id", listingId);
  const myReactionPromise =
    userId != null
      ? supabase
          .from("reactions")
          .select("reaction_type")
          .eq("listing_id", listingId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null });
  const isSavedPromise =
    userId != null
      ? supabase
          .from("saved_listings")
          .select("listing_id")
          .eq("listing_id", listingId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null });

  const [
    photosRes,
    sellerRes,
    topBidRes,
    bidCountRes,
    reactionRowsRes,
    myReactionRes,
    isSavedRes,
    savesCountRes,
  ] = await Promise.all([
    supabase
      .from("listing_photos")
      .select("id, url, position")
      .eq("listing_id", listingId)
      .order("position", { ascending: true }),
    supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, phone_verified, ratings_avg, ratings_count, region"
      )
      .eq("id", listing.seller_id)
      .single(), // optional: add "phone, show_phone_on_listing" after migration 20260209100014
    supabase
      .from("bids")
      .select("amount")
      .eq("listing_id", listingId)
      .order("amount", { ascending: false })
      .limit(1),
    supabase
      .from("bids")
      .select("listing_id", { count: "exact", head: true })
      .eq("listing_id", listingId),
    reactionCountPromise,
    myReactionPromise,
    isSavedPromise,
    supabase
      .from("saved_listings")
      .select("listing_id", { count: "exact", head: true })
      .eq("listing_id", listingId),
  ]);

  const seller = sellerRes.data;
  if (!seller) return null;

  const reaction_counts = { ...EMPTY_REACTION_COUNTS };
  for (const row of reactionRowsRes.data ?? []) {
    const t = row.reaction_type as ReactionType;
    if (t in reaction_counts) reaction_counts[t] += 1;
  }
  const reaction_count = Object.values(reaction_counts).reduce((a, b) => a + b, 0);
  const my_reaction = (myReactionRes.data?.reaction_type as ReactionType) ?? null;
  const is_saved = isSavedRes.data != null;

  const topBid = topBidRes.data?.[0];

  return {
    id: listing.id,
    seller_id: listing.seller_id,
    type: listing.type as "fixed" | "auction",
    swap_enabled: Boolean(listing.swap_enabled),
    category: listing.category as "plant" | "accessory",
    plant_name: listing.plant_name,
    condition: listing.condition ?? null,
    size: listing.size ?? null,
    leaf_count: listing.leaf_count ?? null,
    notes: listing.notes ?? null,
    region: listing.region,
    district: listing.district ?? null,
    fixed_price: listing.fixed_price != null ? Number(listing.fixed_price) : null,
    auction_start_price:
      listing.auction_start_price != null
        ? Number(listing.auction_start_price)
        : null,
    auction_min_increment:
      listing.auction_min_increment != null
        ? Number(listing.auction_min_increment)
        : null,
    auction_ends_at: listing.auction_ends_at ?? null,
    status: listing.status,
    created_at: listing.created_at,
    photos: (photosRes.data ?? []).map((p) => ({
      id: p.id,
      url: p.url,
      position: p.position,
    })),
    seller: {
      id: seller.id,
      display_name: seller.display_name ?? null,
      avatar_url: seller.avatar_url ?? null,
      phone_verified: Boolean(seller.phone_verified),
      ratings_avg:
        seller.ratings_avg != null ? Number(seller.ratings_avg) : null,
      ratings_count: Number(seller.ratings_count) ?? 0,
      region: seller.region ?? null,
      phone: undefined, // set from seller.phone when select includes phone, show_phone_on_listing (migration 20260209100014)
    },
    bid_count: bidCountRes.count ?? 0,
    current_bid: topBid ? Number(topBid.amount) : null,
    reaction_count,
    reaction_counts,
    my_reaction,
    save_count: savesCountRes.count ?? 0,
    is_saved,
  };
}

// ---------------------------------------------------------------------------
// Saved listings (for /saved page)
// ---------------------------------------------------------------------------

export async function getSavedListings(
  userId: string,
  region?: string | null
): Promise<FeedListingCard[]> {
  const supabase = await createSupabaseServerClient();

  const q = supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: savedRows, error: savedErr } = await q;
  if (savedErr || !savedRows?.length) return [];

  const listingIds = savedRows.map((r) => r.listing_id as string);

  let listQ = supabase
    .from("listings")
    .select(
      `id, plant_name, created_at, type, swap_enabled, category, fixed_price, auction_start_price, auction_ends_at, region,
       seller:profiles!listings_seller_id_fkey ( display_name, phone_verified, avatar_url, ratings_avg, ratings_count )`
    )
    .eq("status", PUBLIC_LISTING_STATUS)
    .in("id", listingIds);
  if (region && region !== "All Slovakia") listQ = listQ.eq("region", region);

  const { data: listings, error } = await listQ;
  if (error || !listings?.length) return [];

  const order = new Map(listingIds.map((id, i) => [id, i]));
  const sorted = (listings as Record<string, unknown>[]).sort(
    (a, b) => (order.get(a.id as string) ?? 0) - (order.get(b.id as string) ?? 0)
  );

  const [{ data: photos }, { data: bids }] = await Promise.all([
    supabase
      .from("listing_photos")
      .select("listing_id, url")
      .in("listing_id", listingIds)
      .order("position", { ascending: true }),
    supabase
      .from("bids")
      .select("listing_id, amount")
      .in("listing_id", listingIds)
      .order("amount", { ascending: false }),
  ]);

  const firstPhoto = new Map<string, string>();
  const photoCount = new Map<string, number>();
  for (const p of photos ?? []) {
    const listingId = p.listing_id as string;
    photoCount.set(listingId, (photoCount.get(listingId) ?? 0) + 1);
    if (!firstPhoto.has(listingId)) firstPhoto.set(listingId, p.url);
  }

  const bidStats = new Map<string, { bidCount: number; currentBid: number | null }>();
  for (const row of bids ?? []) {
    const listingId = row.listing_id as string;
    const amount = row.amount != null ? Number(row.amount) : null;
    const current = bidStats.get(listingId);
    if (!current) {
      bidStats.set(listingId, { bidCount: 1, currentBid: amount });
      continue;
    }
    current.bidCount += 1;
    if (amount != null && (current.currentBid == null || amount > current.currentBid)) {
      current.currentBid = amount;
    }
  }

  return sorted.map((l) => {
    const seller = l.seller as Record<string, unknown> | null;
    const listingId = l.id as string;
    const stats = bidStats.get(listingId);
    return {
      id: listingId,
      plant_name: l.plant_name as string,
      created_at: l.created_at as string,
      type: l.type as "fixed" | "auction",
      swap_enabled: Boolean(l.swap_enabled),
      category: l.category as "plant" | "accessory",
      fixed_price: l.fixed_price != null ? Number(l.fixed_price) : null,
      auction_start_price:
        l.auction_start_price != null ? Number(l.auction_start_price) : null,
      auction_ends_at: (l.auction_ends_at as string) ?? null,
      region: l.region as string,
      first_photo_url: firstPhoto.get(listingId) ?? null,
      seller_phone_verified: Boolean(seller?.phone_verified),
      seller_avatar_url: (seller?.avatar_url as string) ?? null,
      seller_ratings_avg:
        seller?.ratings_avg != null ? Number(seller.ratings_avg) : null,
      seller_ratings_count:
        seller?.ratings_count != null ? Number(seller.ratings_count) : 0,
      seller_display_name: (seller?.display_name as string) ?? null,
      bid_count: stats?.bidCount ?? 0,
      current_bid: stats?.currentBid ?? null,
      photo_count: photoCount.get(listingId) ?? 0,
      is_saved: true,
    };
  });
}

export async function getSavedListingsCount(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { data: savedRows, error: savedErr } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId);

  if (savedErr || !savedRows?.length) return 0;

  const listingIds = savedRows.map((row) => row.listing_id as string);

  const { count, error: countErr } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", PUBLIC_LISTING_STATUS)
    .in("id", listingIds);

  if (countErr) return 0;
  return count ?? 0;
}
