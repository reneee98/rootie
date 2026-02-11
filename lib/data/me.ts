import type { OrderStatus } from "@/lib/data/orders";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type MyListingStatus = "active" | "reserved" | "sold" | "expired" | "removed";

export type MyListingCard = {
  id: string;
  plant_name: string;
  type: "fixed" | "auction";
  fixed_price: number | null;
  auction_start_price: number | null;
  first_photo_url: string | null;
  status: MyListingStatus;
};

export type MyListingBuckets = {
  active: MyListingCard[];
  reserved: MyListingCard[];
  sold: MyListingCard[];
  inactive: MyListingCard[];
};

export type MyPurchaseCard = {
  id: string;
  thread_id: string;
  listing_id: string;
  order_status: OrderStatus;
  accepted_price_eur: number | null;
  updated_at: string;
  listing_name: string;
  listing_status: string | null;
  listing_photo_url: string | null;
  seller_display_name: string | null;
};

export type MyPurchaseBuckets = {
  in_progress: MyPurchaseCard[];
  delivered: MyPurchaseCard[];
  cancelled: MyPurchaseCard[];
};

const SELLER_STATUSES: MyListingStatus[] = [
  "active",
  "reserved",
  "sold",
  "expired",
  "removed",
];

const IN_PROGRESS_ORDER_STATUSES: OrderStatus[] = [
  "price_accepted",
  "address_provided",
  "shipped",
];

export async function getMyListingBuckets(userId: string): Promise<MyListingBuckets> {
  const supabase = await createSupabaseServerClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, plant_name, type, fixed_price, auction_start_price, status")
    .eq("seller_id", userId)
    .in("status", SELLER_STATUSES)
    .order("created_at", { ascending: false });

  if (error || !listings?.length) {
    return { active: [], reserved: [], sold: [], inactive: [] };
  }

  const listingIds = listings.map((l) => l.id);
  const { data: photos } = await supabase
    .from("listing_photos")
    .select("listing_id, url")
    .in("listing_id", listingIds)
    .order("position", { ascending: true });

  const firstPhotoByListing = new Map<string, string>();
  for (const photo of photos ?? []) {
    if (!firstPhotoByListing.has(photo.listing_id)) {
      firstPhotoByListing.set(photo.listing_id, photo.url);
    }
  }

  const cards: MyListingCard[] = listings.map((listing) => ({
    id: listing.id,
    plant_name: listing.plant_name,
    type: listing.type as "fixed" | "auction",
    fixed_price: listing.fixed_price != null ? Number(listing.fixed_price) : null,
    auction_start_price:
      listing.auction_start_price != null
        ? Number(listing.auction_start_price)
        : null,
    first_photo_url: firstPhotoByListing.get(listing.id) ?? null,
    status: listing.status as MyListingStatus,
  }));

  return {
    active: cards.filter((listing) => listing.status === "active"),
    reserved: cards.filter((listing) => listing.status === "reserved"),
    sold: cards.filter((listing) => listing.status === "sold"),
    inactive: cards.filter(
      (listing) => listing.status === "expired" || listing.status === "removed"
    ),
  };
}

export async function getMyPurchaseBuckets(userId: string): Promise<MyPurchaseBuckets> {
  const supabase = await createSupabaseServerClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, thread_id, listing_id, seller_id, status, accepted_price_eur, updated_at"
    )
    .eq("buyer_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !orders?.length) {
    return { in_progress: [], delivered: [], cancelled: [] };
  }

  const listingIds = Array.from(new Set(orders.map((o) => o.listing_id)));
  const sellerIds = Array.from(new Set(orders.map((o) => o.seller_id)));

  const [listingsRes, photosRes, sellersRes] = await Promise.all([
    supabase
      .from("listings")
      .select("id, plant_name, status")
      .in("id", listingIds),
    supabase
      .from("listing_photos")
      .select("listing_id, url")
      .in("listing_id", listingIds)
      .order("position", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", sellerIds),
  ]);

  const listingById = new Map<
    string,
    { plant_name: string; status: string | null }
  >(
    (listingsRes.data ?? []).map((listing) => [
      listing.id,
      {
        plant_name: listing.plant_name ?? "Inzerát",
        status: listing.status ?? null,
      },
    ])
  );

  const firstPhotoByListing = new Map<string, string>();
  for (const photo of photosRes.data ?? []) {
    if (!firstPhotoByListing.has(photo.listing_id)) {
      firstPhotoByListing.set(photo.listing_id, photo.url);
    }
  }

  const sellerDisplayNameById = new Map<string, string | null>(
    (sellersRes.data ?? []).map((seller) => [
      seller.id,
      seller.display_name ?? null,
    ])
  );

  const cards: MyPurchaseCard[] = orders.map((order) => {
    const listing = listingById.get(order.listing_id);
    return {
      id: order.id,
      thread_id: order.thread_id,
      listing_id: order.listing_id,
      order_status: order.status as OrderStatus,
      accepted_price_eur:
        order.accepted_price_eur != null
          ? Number(order.accepted_price_eur)
          : null,
      updated_at: order.updated_at,
      listing_name: listing?.plant_name ?? "Inzerát",
      listing_status: listing?.status ?? null,
      listing_photo_url: firstPhotoByListing.get(order.listing_id) ?? null,
      seller_display_name: sellerDisplayNameById.get(order.seller_id) ?? null,
    };
  });

  return {
    in_progress: cards.filter((order) =>
      IN_PROGRESS_ORDER_STATUSES.includes(order.order_status)
    ),
    delivered: cards.filter((order) => order.order_status === "delivered"),
    cancelled: cards.filter((order) => order.order_status === "cancelled"),
  };
}
