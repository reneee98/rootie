"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/auth";

export type PlaceBidResult =
  | { ok: true; bidId: string; amount: number }
  | { ok: false; error: string };

export async function placeBid(
  listingId: string,
  amount: number
): Promise<PlaceBidResult> {
  const user = await requireUser(`/listing/${listingId}`);
  const supabase = await createSupabaseServerClient();

  /* ---------- fetch listing ---------- */
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(
      "id, seller_id, type, auction_start_price, auction_min_increment, auction_ends_at, status"
    )
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    return { ok: false, error: "Inzerát nebol nájdený." };
  }

  if (listing.type !== "auction") {
    return { ok: false, error: "Toto nie je aukcia." };
  }

  if (listing.status !== "active") {
    return { ok: false, error: "Aukcia nie je aktívna." };
  }

  if (listing.seller_id === user.id) {
    return { ok: false, error: "Nemôžete prihodiť na vlastný inzerát." };
  }

  const endsAt = listing.auction_ends_at
    ? new Date(listing.auction_ends_at)
    : null;
  if (endsAt && endsAt <= new Date()) {
    return { ok: false, error: "Aukcia už skončila." };
  }

  /* ---------- determine minimum bid ---------- */
  const { data: topBidRows } = await supabase
    .from("bids")
    .select("amount")
    .eq("listing_id", listingId)
    .order("amount", { ascending: false })
    .limit(1);

  const startPrice = Number(listing.auction_start_price);
  const minIncrement = Number(listing.auction_min_increment);
  const topBidAmount = topBidRows?.[0]
    ? Number(topBidRows[0].amount)
    : null;

  // First bid: must be >= start price.
  // Subsequent bids: must be >= current top bid + min increment.
  const minBid =
    topBidAmount != null ? topBidAmount + minIncrement : startPrice;

  if (amount < minBid) {
    return {
      ok: false,
      error: `Minimálna ponuka je ${minBid.toFixed(2)} €.`,
    };
  }

  /* ---------- insert bid (RLS also enforces rules) ---------- */
  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .insert({
      listing_id: listingId,
      bidder_id: user.id,
      amount,
    })
    .select("id, amount")
    .single();

  if (bidError || !bid) {
    console.error("Bid insert error:", bidError);
    return {
      ok: false,
      error: "Nepodarilo sa pridať ponuku. Skúste to znova.",
    };
  }

  return { ok: true, bidId: bid.id, amount: Number(bid.amount) };
}
