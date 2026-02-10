import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type ProfilePublic = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  region: string | null;
  district: string | null;
  phone_verified: boolean;
  ratings_avg: number | null;
  ratings_count: number;
  active_listings_count: number;
  sold_count: number;
};

export type ListingCard = {
  id: string;
  plant_name: string;
  type: "fixed" | "auction";
  fixed_price: number | null;
  auction_start_price: number | null;
  first_photo_url: string | null;
};

export async function getProfileByUserId(
  userId: string
): Promise<ProfilePublic | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, bio, region, district, phone_verified, ratings_avg, ratings_count, active_listings_count, sold_count"
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    display_name: data.display_name ?? null,
    avatar_url: data.avatar_url ?? null,
    bio: data.bio ?? null,
    region: data.region ?? null,
    district: data.district ?? null,
    phone_verified: Boolean(data.phone_verified),
    ratings_avg: data.ratings_avg != null ? Number(data.ratings_avg) : null,
    ratings_count: Number(data.ratings_count) ?? 0,
    active_listings_count: Number(data.active_listings_count) ?? 0,
    sold_count: Number(data.sold_count) ?? 0,
  };
}

export async function getActiveListingsBySeller(
  sellerId: string
): Promise<ListingCard[]> {
  const supabase = await createSupabaseServerClient();
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("id, plant_name, type, fixed_price, auction_start_price")
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (listingsError || !listings?.length) {
    return [];
  }

  const listingIds = listings.map((l) => l.id);
  const { data: photos } = await supabase
    .from("listing_photos")
    .select("listing_id, url")
    .in("listing_id", listingIds)
    .order("position", { ascending: true });

  const firstPhotoByListing = new Map<string, string>();
  for (const p of photos ?? []) {
    if (!firstPhotoByListing.has(p.listing_id)) {
      firstPhotoByListing.set(p.listing_id, p.url);
    }
  }

  return listings.map((l) => ({
    id: l.id,
    plant_name: l.plant_name,
    type: l.type as "fixed" | "auction",
    fixed_price: l.fixed_price != null ? Number(l.fixed_price) : null,
    auction_start_price:
      l.auction_start_price != null ? Number(l.auction_start_price) : null,
    first_photo_url: firstPhotoByListing.get(l.id) ?? null,
  }));
}

export async function getIsBlocked(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  if (blockerId === blockedId) return false;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  return data != null;
}
