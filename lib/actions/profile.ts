"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export type UpdateProfileInfoResult =
  | { ok: true }
  | { ok: false; error: string };

/** Update current user's display name and bio. */
export async function updateProfileInfo(
  displayName: string,
  bio: string
): Promise<UpdateProfileInfoResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Nie ste prihlásený" };
  }

  if (typeof displayName !== "string" || typeof bio !== "string") {
    return { ok: false, error: "Neplatné údaje profilu." };
  }
  const trimmedName = displayName.trim();
  const trimmedBio = bio.trim();
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    return { ok: false, error: "Meno musí mať 2 až 80 znakov." };
  }
  if (trimmedBio.length > 500) {
    return { ok: false, error: "Bio môže mať najviac 500 znakov." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: trimmedName || null,
      bio: trimmedBio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/me");
  revalidatePath("/profile/[userId]", "page");
  return { ok: true };
}

export type UpdatePhoneResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Update current user's profile: phone (optional) and show_phone_on_listing.
 * Phone is stored but not verified by this action; use OTP flow for verification.
 */
export async function updateProfilePhone(
  phone: string | null,
  showPhoneOnListing: boolean
): Promise<UpdatePhoneResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Nie ste prihlásený" };
  }

  if ((phone !== null && typeof phone !== "string") || typeof showPhoneOnListing !== "boolean") {
    return { ok: false, error: "Neplatné nastavenia telefónu." };
  }
  const rawPhone = phone?.trim() || null;
  const normalized = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !normalized) {
    return { ok: false, error: "Zadajte platné číslo (napr. +421901234567)" };
  }

  const supabase = await createSupabaseServerClient();
  const authPhone = user.phone ? normalizePhone(`+${user.phone.replace(/^\+/, "")}`) : null;
  const phoneVerified = Boolean(normalized && authPhone === normalized && user.phone_confirmed_at);
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: normalized,
      phone_verified: phoneVerified,
      show_phone_on_listing: showPhoneOnListing,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/me");
  revalidatePath("/profile/[userId]", "page");
  revalidatePath("/listing/[id]", "page");
  return { ok: true };
}

/**
 * Sync phone_verified (and phone) from current auth user to profiles.
 * Call after successful Supabase verifyOtp so profile shows verified badge.
 */
export async function syncPhoneVerifiedFromAuth(): Promise<UpdatePhoneResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Nie ste prihlásený" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("sync_phone_verified_from_auth");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/me");
  revalidatePath("/profile/[userId]", "page");
  revalidatePath("/listing/[id]", "page");
  revalidatePath("/inbox");
  return { ok: true };
}

export type UpdateDefaultShippingAddressResult =
  | { ok: true }
  | { ok: false; error: string };

type ShippingAddressInput = {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string | null;
};

function normalizeShippingAddressInput(
  input: ShippingAddressInput
): ShippingAddressInput | null {
  if (!input || [input.name, input.street, input.city, input.zip, input.country].some((value) => typeof value !== "string")) {
    return null;
  }
  if (input.phone != null && typeof input.phone !== "string") return null;
  const name = input.name.trim();
  const street = input.street.trim();
  const city = input.city.trim();
  const zip = input.zip.trim();
  const country = input.country.trim();
  const phone = input.phone?.trim() || null;

  if (!name || !street || !city || !zip || !country ||
    name.length > 120 || street.length > 200 || city.length > 100 || zip.length > 20 || country.length > 80 || (phone?.length ?? 0) > 40) {
    return null;
  }

  return {
    name,
    street,
    city,
    zip,
    country,
    phone,
  };
}

export async function updateDefaultShippingAddress(
  input: ShippingAddressInput
): Promise<UpdateDefaultShippingAddressResult> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Nie ste prihlásený" };
  }

  const normalized = normalizeShippingAddressInput(input);
  if (!normalized) {
    return { ok: false, error: "Vyplňte všetky povinné polia adresy." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profile_shipping_addresses")
    .upsert(
      {
        user_id: user.id,
        name: normalized.name,
        street: normalized.street,
        city: normalized.city,
        zip: normalized.zip,
        country: normalized.country,
        phone: normalized.phone ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/me");
  revalidatePath("/me/shipping");
  revalidatePath("/chat/[threadId]", "page");
  return { ok: true };
}
