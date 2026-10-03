"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/auth";
import { validateCreateListingInput } from "@/lib/create-listing-validation";

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
  const validationError = validateCreateListingInput(input);
  if (validationError) return { ok: false, error: validationError };

  // A listing may reference only this user's uploaded photos from this project.
  const storageOrigin = new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const photoPrefix = `/storage/v1/object/public/listing-photos/${user.id}/`;
  if (input.photoUrls.some((value) => {
    const url = new URL(value);
    return url.origin !== storageOrigin || !url.pathname.startsWith(photoPrefix);
  })) return { ok: false, error: "Použite fotky nahrané k tomuto inzerátu." };

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
      // Publishing must never claim success with a listing missing every photo.
      const { error: cleanupError } = await supabase.from("listings").delete().eq("id", listing.id).eq("seller_id", user.id);
      if (cleanupError) {
        const { error: removalError } = await supabase.from("listings").update({ status: "removed" }).eq("id", listing.id).eq("seller_id", user.id);
        console.error("Incomplete listing cleanup error:", cleanupError);
        if (removalError) return { ok: false, error: "Fotky sa nepodarilo uložiť a inzerát odstrániť. Skontrolujte svoje inzeráty." };
      }
      return { ok: false, error: "Fotky sa nepodarilo uložiť. Inzerát nebol zverejnený, skúste to znova." };
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
