"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { ShippingAddress } from "@/lib/data/orders";

type ActionResult = { ok: true } | { ok: false; error: string };

export type SendShippingAddressInput = ShippingAddress & { saveAsDefault?: boolean };

async function performOrderAction(
  threadId: string,
  action: "accept_price" | "accept_swap" | "decline" | "address" | "shipped" | "delivered",
  options: {
    offerMessageId?: string;
    shippingAddress?: ShippingAddress;
    trackingNumber?: string | null;
    saveAsDefault?: boolean;
  } = {}
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa." };
  const supabase = await createSupabaseServerClient();
  const { data: thread } = await supabase.from("threads").select("listing_id, user1_id, user2_id")
    .eq("id", threadId).maybeSingle();
  if (!thread || (thread.user1_id !== user.id && thread.user2_id !== user.id)) {
    return { ok: false, error: "Nemáte prístup ku konverzácii." };
  }
  const { error } = await supabase.rpc("perform_order_action", {
    p_thread_id: threadId,
    p_action: action,
    p_offer_message_id: options.offerMessageId ?? null,
    p_shipping_address: options.shippingAddress ?? null,
    p_tracking_number: options.trackingNumber ?? null,
    p_save_as_default: options.saveAsDefault ?? false,
  });
  if (error) {
    console.error("Order action error:", error);
    return { ok: false, error: error.code === "PGRST202"
      ? "Dohody momentálne nie sú dostupné. Skúste to neskôr."
      : error.message };
  }
  for (const path of [`/chat/${threadId}`, "/inbox", "/me", "/", "/saved"]) revalidatePath(path);
  if (thread.listing_id) revalidatePath(`/listing/${thread.listing_id}`);
  if (action === "delivered") revalidatePath("/review");
  return { ok: true };
}

export async function acceptListingPriceOffer(threadId: string, offerMessageId: string): Promise<ActionResult> {
  return performOrderAction(threadId, "accept_price", { offerMessageId });
}

export async function acceptListingSwapOffer(threadId: string, offerMessageId: string): Promise<ActionResult> {
  return performOrderAction(threadId, "accept_swap", { offerMessageId });
}

export async function declineListingOffer(threadId: string, offerMessageId: string): Promise<ActionResult> {
  return performOrderAction(threadId, "decline", { offerMessageId });
}

export async function sendOrderShippingAddress(threadId: string, input: SendShippingAddressInput): Promise<ActionResult> {
  const fields = ["name", "street", "city", "zip", "country"] as const;
  if (!input || fields.some((field) => typeof input[field] !== "string" || !input[field].trim() || input[field].length > 300) ||
      (input.phone != null && (typeof input.phone !== "string" || input.phone.length > 50))) {
    return { ok: false, error: "Vyplňte všetky povinné polia adresy." };
  }
  const address: ShippingAddress = {
    name: input.name.trim(), street: input.street.trim(), city: input.city.trim(), zip: input.zip.trim(),
    country: input.country.trim(), phone: input.phone?.trim() || null,
  };
  return performOrderAction(threadId, "address", { shippingAddress: address, saveAsDefault: input.saveAsDefault === true });
}

export async function markOrderShipped(threadId: string, trackingNumber?: string): Promise<ActionResult> {
  if (trackingNumber != null && (typeof trackingNumber !== "string" || trackingNumber.length > 120)) {
    return { ok: false, error: "Tracking číslo je príliš dlhé." };
  }
  return performOrderAction(threadId, "shipped", { trackingNumber: trackingNumber?.trim() || null });
}

export async function markOrderDelivered(threadId: string): Promise<ActionResult> {
  return performOrderAction(threadId, "delivered");
}
