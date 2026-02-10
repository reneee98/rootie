import { createSupabaseServerClient } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuctionBid = {
  id: string;
  amount: number;
  created_at: string;
  bidder: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export type SellerAuctionListing = {
  listing_id: string;
  plant_name: string;
  auction_start_price: number;
  auction_ends_at: string;
  image_url: string | null;
  bids: AuctionBid[];
};

// ---------------------------------------------------------------------------
// Fetch all auction listings belonging to seller, with every bid + bidder info
// ---------------------------------------------------------------------------

export async function getSellerAuctionListings(
  sellerId: string
): Promise<SellerAuctionListing[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Get seller's auction listings (active or recently ended)
  const { data: listings, error: listingsErr } = await supabase
    .from("listings")
    .select("id, plant_name, auction_start_price, auction_ends_at")
    .eq("seller_id", sellerId)
    .eq("type", "auction")
    .in("status", ["active"])
    .order("created_at", { ascending: false });

  if (listingsErr || !listings?.length) return [];

  const listingIds = listings.map((l) => l.id);

  // 2. Get all bids for these listings
  const { data: bids } = await supabase
    .from("bids")
    .select("id, listing_id, bidder_id, amount, created_at")
    .in("listing_id", listingIds)
    .order("amount", { ascending: false });

  // 3. Get bidder profiles
  const bidderIds = [...new Set((bids ?? []).map((b) => b.bidder_id))];
  const profilesMap = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();

  if (bidderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", bidderIds);
    for (const p of profiles ?? []) {
      profilesMap.set(p.id, {
        id: p.id,
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
      });
    }
  }

  // 4. Get first photo per listing
  const firstPhotoUrls = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id, url")
      .in("listing_id", listingIds)
      .order("position", { ascending: true });
    for (const p of photos ?? []) {
      if (!firstPhotoUrls.has(p.listing_id)) {
        firstPhotoUrls.set(p.listing_id, p.url);
      }
    }
  }

  // 5. Assemble result
  return listings.map((l) => {
    const listingBids = (bids ?? [])
      .filter((b) => b.listing_id === l.id)
      .map((b) => ({
        id: b.id,
        amount: Number(b.amount),
        created_at: b.created_at,
        bidder: profilesMap.get(b.bidder_id) ?? {
          id: b.bidder_id,
          display_name: null,
          avatar_url: null,
        },
      }));

    return {
      listing_id: l.id,
      plant_name: l.plant_name,
      auction_start_price: Number(l.auction_start_price),
      auction_ends_at: l.auction_ends_at,
      image_url: firstPhotoUrls.get(l.id) ?? null,
      bids: listingBids,
    };
  });
}

// ---------------------------------------------------------------------------
// Types for bidder view
// ---------------------------------------------------------------------------

export type BidderAuctionListing = {
  listing_id: string;
  plant_name: string;
  auction_start_price: number;
  auction_ends_at: string;
  image_url: string | null;
  seller: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  /** Current top bid across all bidders */
  top_bid: number;
  /** Total number of bids on this listing */
  total_bid_count: number;
  /** This user's highest bid */
  my_highest_bid: number;
  /** When the user last bid */
  my_last_bid_at: string;
  /** Whether the user currently holds the top bid */
  is_winning: boolean;
};

// ---------------------------------------------------------------------------
// Fetch auctions where the current user has placed bids (bidder/buyer view)
// ---------------------------------------------------------------------------

export async function getBidderAuctionListings(
  bidderId: string
): Promise<BidderAuctionListing[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Get all bids placed by this user
  const { data: myBids, error: myBidsErr } = await supabase
    .from("bids")
    .select("id, listing_id, amount, created_at")
    .eq("bidder_id", bidderId)
    .order("amount", { ascending: false });

  if (myBidsErr || !myBids?.length) return [];

  // Unique listing IDs where user has bid
  const listingIds = [...new Set(myBids.map((b) => b.listing_id))];

  // 2. Get listing info (only active auctions)
  const { data: listings } = await supabase
    .from("listings")
    .select("id, seller_id, plant_name, auction_start_price, auction_ends_at")
    .in("id", listingIds)
    .eq("type", "auction")
    .eq("status", "active");

  if (!listings?.length) return [];

  const activeListingIds = listings.map((l) => l.id);

  // 3. Get ALL bids for these listings (to determine top bid and count)
  const { data: allBids } = await supabase
    .from("bids")
    .select("listing_id, bidder_id, amount")
    .in("listing_id", activeListingIds)
    .order("amount", { ascending: false });

  // 4. Get seller profiles
  const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
  const sellerMap = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
  if (sellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", sellerIds);
    for (const p of profiles ?? []) {
      sellerMap.set(p.id, { id: p.id, display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null });
    }
  }

  // 5. Get first photo per listing
  const photoMap = new Map<string, string>();
  if (activeListingIds.length > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id, url")
      .in("listing_id", activeListingIds)
      .order("position", { ascending: true });
    for (const p of photos ?? []) {
      if (!photoMap.has(p.listing_id)) photoMap.set(p.listing_id, p.url);
    }
  }

  // 6. Assemble
  return listings.map((l) => {
    const bidsForListing = (allBids ?? []).filter((b) => b.listing_id === l.id);
    const topBid = bidsForListing[0] ? Number(bidsForListing[0].amount) : Number(l.auction_start_price);
    const totalBidCount = bidsForListing.length;

    const userBidsForListing = myBids
      .filter((b) => b.listing_id === l.id)
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    const myHighest = userBidsForListing[0];
    const myHighestAmount = myHighest ? Number(myHighest.amount) : 0;

    // User is winning if their highest bid equals the top bid
    const isWinning = myHighestAmount >= topBid && topBid > 0;

    return {
      listing_id: l.id,
      plant_name: l.plant_name,
      auction_start_price: Number(l.auction_start_price),
      auction_ends_at: l.auction_ends_at,
      image_url: photoMap.get(l.id) ?? null,
      seller: sellerMap.get(l.seller_id) ?? { id: l.seller_id, display_name: null, avatar_url: null },
      top_bid: topBid,
      total_bid_count: totalBidCount,
      my_highest_bid: myHighestAmount,
      my_last_bid_at: userBidsForListing[0]?.created_at ?? "",
      is_winning: isWinning,
    };
  }).sort((a, b) => {
    // Show winning first, then by last bid time
    if (a.is_winning !== b.is_winning) return a.is_winning ? -1 : 1;
    return new Date(b.my_last_bid_at).getTime() - new Date(a.my_last_bid_at).getTime();
  });
}
