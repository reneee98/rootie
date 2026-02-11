import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type OrderStatus =
  | "negotiating"
  | "price_accepted"
  | "address_provided"
  | "shipped"
  | "delivered"
  | "cancelled";

export type ShippingAddress = {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string | null;
};

export type ThreadOrder = {
  id: string;
  thread_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  accepted_price_eur: number | null;
  shipping_address: ShippingAddress | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileShippingAddress = ShippingAddress;

function isMissingRelationError(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

function parseShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;

  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const street =
    typeof candidate.street === "string" ? candidate.street.trim() : "";
  const city = typeof candidate.city === "string" ? candidate.city.trim() : "";
  const zip = typeof candidate.zip === "string" ? candidate.zip.trim() : "";
  const country =
    typeof candidate.country === "string" ? candidate.country.trim() : "";
  const phone =
    typeof candidate.phone === "string" ? candidate.phone.trim() : null;

  if (!name || !street || !city || !zip || !country) {
    return null;
  }

  return {
    name,
    street,
    city,
    zip,
    country,
    phone: phone && phone.length > 0 ? phone : null,
  };
}

function mapThreadOrder(row: {
  id: string;
  thread_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  accepted_price_eur: number | string | null;
  shipping_address: unknown;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}): ThreadOrder {
  const acceptedPrice =
    row.accepted_price_eur != null ? Number(row.accepted_price_eur) : null;

  return {
    id: row.id,
    thread_id: row.thread_id,
    listing_id: row.listing_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    status: row.status,
    accepted_price_eur:
      acceptedPrice != null && Number.isFinite(acceptedPrice)
        ? acceptedPrice
        : null,
    shipping_address: parseShippingAddress(row.shipping_address),
    tracking_number: row.tracking_number ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getThreadOrder(threadId: string): Promise<ThreadOrder | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, thread_id, listing_id, buyer_id, seller_id, status, accepted_price_eur, shipping_address, tracking_number, created_at, updated_at"
    )
    .eq("thread_id", threadId)
    .maybeSingle();

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("getThreadOrder error", error);
    }
    return null;
  }

  return data ? mapThreadOrder(data) : null;
}

export async function getProfileShippingAddress(
  userId: string
): Promise<ProfileShippingAddress | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profile_shipping_addresses")
    .select("name, street, city, zip, country, phone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("getProfileShippingAddress error", error);
    }
    return null;
  }

  if (!data) return null;

  return parseShippingAddress(data) ?? null;
}
