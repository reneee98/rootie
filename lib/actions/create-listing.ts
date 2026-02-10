"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/auth";
import { SLOVAK_REGIONS } from "@/lib/regions";

export type CreateListingInput = {
  type: "fixed" | "auction";
  swapEnabled: boolean;
  category: "plant" | "accessory";
  plantName: string;
  plantTaxonId: string | null;
  condition: string;
  size: string;
  notes: string;
  region: string;
  district: string;
  fixedPrice: number | null;
  auctionStartPrice: number | null;
  auctionMinIncrement: number | null;
  auctionEndsAt: string | null;
  photoUrls: string[];
};

export type CreateListingResult =
  | { ok: true; listingId: string }
  | { ok: false; error: string };

export async function publishListing(
  input: CreateListingInput
): Promise<CreateListingResult> {
  const user = await requireUser("/create");
  const supabase = await createSupabaseServerClient();

  /* ---------- validation ---------- */
  if (!input.plantName.trim()) {
    return { ok: false, error: "Názov rastliny je povinný." };
  }

  if (
    !input.region ||
    !(SLOVAK_REGIONS as readonly string[]).includes(input.region)
  ) {
    return { ok: false, error: "Vyberte platný kraj." };
  }

  if (input.photoUrls.length === 0) {
    return { ok: false, error: "Pridajte aspoň jednu fotku." };
  }

  if (input.type === "fixed") {
    if (!input.fixedPrice || input.fixedPrice <= 0) {
      return { ok: false, error: "Zadajte platnú cenu." };
    }
  } else {
    if (!input.auctionStartPrice || input.auctionStartPrice <= 0) {
      return { ok: false, error: "Zadajte platnú začiatočnú cenu." };
    }
    if (!input.auctionMinIncrement || input.auctionMinIncrement <= 0) {
      return { ok: false, error: "Zadajte platný minimálny príhoz." };
    }
    if (!input.auctionEndsAt) {
      return { ok: false, error: "Vyberte dobu trvania aukcie." };
    }
  }

  /* ---------- insert listing ---------- */
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      type: input.type,
      swap_enabled: input.swapEnabled,
      category: input.category,
      plant_name: input.plantName.trim(),
      plant_taxon_id: input.plantTaxonId || null,
      condition: input.condition || null,
      size: input.size || null,
      notes: input.notes || null,
      region: input.region,
      district: input.district || null,
      fixed_price: input.type === "fixed" ? input.fixedPrice : null,
      auction_start_price:
        input.type === "auction" ? input.auctionStartPrice : null,
      auction_min_increment:
        input.type === "auction" ? input.auctionMinIncrement : null,
      auction_ends_at:
        input.type === "auction" ? input.auctionEndsAt : null,
    })
    .select("id")
    .single();

  if (listingError || !listing) {
    console.error("Listing insert error:", listingError);
    return {
      ok: false,
      error: "Nepodarilo sa vytvoriť inzerát. Skúste to znova.",
    };
  }

  /* ---------- insert photos ---------- */
  if (input.photoUrls.length > 0) {
    const photoRows = input.photoUrls.map((url, i) => ({
      listing_id: listing.id,
      url,
      position: i,
    }));

    const { error: photosError } = await supabase
      .from("listing_photos")
      .insert(photoRows);

    if (photosError) {
      console.error("Photos insert error:", photosError);
    }
  }

  /* ---------- update profile counters ---------- */
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_listings_count")
    .eq("id", user.id)
    .single();

  await supabase
    .from("profiles")
    .update({
      is_seller: true,
      active_listings_count: (profile?.active_listings_count ?? 0) + 1,
    })
    .eq("id", user.id);

  return { ok: true, listingId: listing.id };
}
