"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

export type UpdatePhoneResult =
  | { ok: true }
  | { ok: false; error: string };

/** E.164-ish: optional +, then digits (9–15). */
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9) return value;
  if (value.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("421") && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 9 && digits.length <= 15) return `+${digits}`;
  return value;
}

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

  const normalized = phone?.trim() ? normalizePhone(phone.trim()) : null;
  if (normalized !== null && !PHONE_REGEX.test(normalized)) {
    return { ok: false, error: "Zadajte platné číslo (napr. +421901234567)" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: normalized,
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

  const phone = (user as { phone?: string | null }).phone ?? null;
  const phoneVerified = Boolean((user as { phone_confirmed_at?: string | null }).phone_confirmed_at);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: phone ?? undefined,
      phone_verified: phoneVerified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

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
  const name = input.name.trim();
  const street = input.street.trim();
  const city = input.city.trim();
  const zip = input.zip.trim();
  const country = input.country.trim();
  const phone = input.phone?.trim() || null;

  if (!name || !street || !city || !zip || !country) {
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
  return { ok: true };
}
