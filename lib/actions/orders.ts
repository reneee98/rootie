"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { OrderStatus, ShippingAddress } from "@/lib/data/orders";
import { canTransitionOrder } from "@/lib/order-state-machine";
import { getListingStatusForOrderTransition } from "@/lib/listing-lifecycle";

type ActionResult = { ok: true } | { ok: false; error: string };

export type SendShippingAddressInput = {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string | null;
  saveAsDefault?: boolean;
};

const offerAmountFormatter = new Intl.NumberFormat("sk-SK", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function isMissingThreadOrderDeliveredAtColumnError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;

  const isMissingColumnCode =
    error.code === "42703" || error.code === "PGRST204";
  return isMissingColumnCode && (error.message ?? "").includes("order_delivered_at");
}

function parsePositiveAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * 100) / 100;
    }
  }

  return null;
}

function normalizeShippingAddress(
  input: SendShippingAddressInput
): ShippingAddress | null {
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

function formatAddressForThread(address: ShippingAddress): string {
  const lines = [
    "Adresa pre odoslanie:",
    address.name,
    address.street,
    `${address.zip} ${address.city}`,
    address.country,
  ];

  if (address.phone) {
    lines.push(`Tel.: ${address.phone}`);
  }

  return lines.join("\n");
}

function revalidateOrderViews(threadId: string, listingId: string | null) {
  revalidatePath(`/chat/${threadId}`);
  revalidatePath("/inbox");
  revalidatePath("/me");
  revalidatePath("/");
  revalidatePath("/saved");
  if (listingId) {
    revalidatePath(`/listing/${listingId}`);
  }
}

async function getListingThreadContext(threadId: string, userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, context_type, listing_id, user1_id, user2_id")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError || !thread) {
    return {
      ok: false as const,
      supabase,
      error: "Konverzácia neexistuje.",
    };
  }

  const isParticipant =
    thread.user1_id === userId || thread.user2_id === userId;
  if (!isParticipant) {
    return {
      ok: false as const,
      supabase,
      error: "Nemáte prístup ku konverzácii.",
    };
  }

  if (thread.context_type !== "listing" || !thread.listing_id) {
    return {
      ok: false as const,
      supabase,
      error: "Objednávka je dostupná len pre konverzáciu k inzerátu.",
    };
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", thread.listing_id)
    .maybeSingle();

  if (listingError || !listing) {
    return {
      ok: false as const,
      supabase,
      error: "Inzerát sa nenašiel.",
    };
  }

  const sellerId = listing.seller_id;
  const buyerId = thread.user1_id === sellerId ? thread.user2_id : thread.user1_id;

  return {
    ok: true as const,
    supabase,
    thread,
    sellerId,
    buyerId,
  };
}

export async function acceptListingPriceOffer(
  threadId: string,
  offerMessageId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa." };

  const threadCtx = await getListingThreadContext(threadId, user.id);
  if (!threadCtx.ok) {
    return { ok: false, error: threadCtx.error };
  }

  const { supabase, thread, sellerId, buyerId } = threadCtx;

  if (user.id !== sellerId) {
    return { ok: false, error: "Cenu môže potvrdiť iba predajca." };
  }

  const { data: offerMessage, error: offerError } = await supabase
    .from("messages")
    .select("id, sender_id, message_type, body, metadata")
    .eq("id", offerMessageId)
    .eq("thread_id", thread.id)
    .maybeSingle();

  if (offerError || !offerMessage) {
    return { ok: false, error: "Ponuka sa nenašla." };
  }

  if (offerMessage.message_type !== "offer_price") {
    return { ok: false, error: "Potvrdiť môžete iba cenovú ponuku." };
  }

  if (offerMessage.sender_id === sellerId || offerMessage.sender_id !== buyerId) {
    return { ok: false, error: "Ponuka nebola od kupujúceho." };
  }

  const metadata = (offerMessage.metadata as Record<string, unknown> | null) ?? {};
  const amount =
    parsePositiveAmount(metadata.amount_eur) ??
    parsePositiveAmount(metadata.amount) ??
    parsePositiveAmount(offerMessage.body);

  if (amount == null) {
    return { ok: false, error: "Ponuka neobsahuje platnú sumu." };
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("status")
    .eq("thread_id", thread.id)
    .maybeSingle();

  if (existingOrderError) {
    return { ok: false, error: existingOrderError.message };
  }

  const priceTransition = canTransitionOrder({
    from: (existingOrder?.status as OrderStatus | undefined) ?? "negotiating",
    to: "price_accepted",
    actor: "seller",
  });

  if (!priceTransition.allowed) {
    return {
      ok: false,
      error: priceTransition.reason ?? "Cenu už v tomto stave nemožno potvrdiť.",
    };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .upsert(
      {
        thread_id: thread.id,
        listing_id: thread.listing_id,
        buyer_id: buyerId,
        seller_id: sellerId,
        status: "price_accepted",
        accepted_price_eur: amount,
      },
      { onConflict: "thread_id" }
    )
    .select("id")
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message ?? "Nepodarilo sa uložiť objednávku." };
  }

  const body = `Cena odsúhlasená: ${offerAmountFormatter.format(amount)}`;
  const listingStatus = getListingStatusForOrderTransition({
    nextOrderStatus: "price_accepted",
    previousOrderStatus: (existingOrder?.status as OrderStatus | undefined) ?? "negotiating",
  });
  const { error: msgError } = await supabase.from("messages").insert({
    thread_id: thread.id,
    sender_id: sellerId,
    body,
    message_type: "order_status",
    metadata: {
      order_id: order.id,
      order_status: "price_accepted",
      listing_status: listingStatus,
      accepted_price_eur: amount,
      source_offer_message_id: offerMessage.id,
    },
    attachments: [],
  });

  if (msgError) {
    return { ok: false, error: msgError.message };
  }

  revalidateOrderViews(thread.id, thread.listing_id);
  return { ok: true };
}

export async function acceptListingSwapOffer(
  threadId: string,
  offerMessageId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa." };

  const threadCtx = await getListingThreadContext(threadId, user.id);
  if (!threadCtx.ok) {
    return { ok: false, error: threadCtx.error };
  }

  const { supabase, thread, sellerId, buyerId } = threadCtx;

  if (user.id !== sellerId) {
    return { ok: false, error: "Výmenu môže potvrdiť iba predajca." };
  }

  const { data: offerMessage, error: offerError } = await supabase
    .from("messages")
    .select("id, sender_id, message_type")
    .eq("id", offerMessageId)
    .eq("thread_id", thread.id)
    .maybeSingle();

  if (offerError || !offerMessage) {
    return { ok: false, error: "Ponuka sa nenašla." };
  }

  if (offerMessage.message_type !== "offer_swap") {
    return { ok: false, error: "Potvrdiť môžete iba ponuku výmeny." };
  }

  if (offerMessage.sender_id === sellerId || offerMessage.sender_id !== buyerId) {
    return { ok: false, error: "Ponuka nebola od kupujúceho." };
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("status")
    .eq("thread_id", thread.id)
    .maybeSingle();

  if (existingOrderError) {
    return { ok: false, error: existingOrderError.message };
  }

  const swapTransition = canTransitionOrder({
    from: (existingOrder?.status as OrderStatus | undefined) ?? "negotiating",
    to: "price_accepted",
    actor: "seller",
  });

  if (!swapTransition.allowed) {
    return {
      ok: false,
      error: swapTransition.reason ?? "Výmenu už v tomto stave nemožno potvrdiť.",
    };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .upsert(
      {
        thread_id: thread.id,
        listing_id: thread.listing_id,
        buyer_id: buyerId,
        seller_id: sellerId,
        status: "price_accepted",
        // For swap we keep a tiny sentinel value so DB constraints requiring > 0 pass.
        accepted_price_eur: 0.01,
      },
      { onConflict: "thread_id" }
    )
    .select("id")
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message ?? "Nepodarilo sa uložiť objednávku." };
  }

  const listingStatus = getListingStatusForOrderTransition({
    nextOrderStatus: "price_accepted",
    previousOrderStatus: (existingOrder?.status as OrderStatus | undefined) ?? "negotiating",
  });
  const { error: msgError } = await supabase.from("messages").insert({
    thread_id: thread.id,
    sender_id: sellerId,
    body: "Výmena odsúhlasená",
    message_type: "order_status",
    metadata: {
      order_id: order.id,
      order_status: "price_accepted",
      listing_status: listingStatus,
      accepted_offer_type: "swap",
      source_offer_message_id: offerMessage.id,
    },
    attachments: [],
  });

  if (msgError) {
    return { ok: false, error: msgError.message };
  }

  revalidateOrderViews(thread.id, thread.listing_id);
  return { ok: true };
}

export async function sendOrderShippingAddress(
  threadId: string,
  input: SendShippingAddressInput
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa." };

  const address = normalizeShippingAddress(input);
  if (!address) {
    return { ok: false, error: "Vyplňte všetky povinné polia adresy." };
  }

  const threadCtx = await getListingThreadContext(threadId, user.id);
  if (!threadCtx.ok) {
    return { ok: false, error: threadCtx.error };
  }

  const { supabase, thread, buyerId } = threadCtx;

  if (user.id !== buyerId) {
    return { ok: false, error: "Adresu môže odoslať iba kupujúci." };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("thread_id", thread.id)
    .maybeSingle();

  if (orderError || !order) {
    return {
      ok: false,
      error: "Objednávka ešte nie je pripravená. Predajca musí najprv potvrdiť cenu.",
    };
  }

  const addressTransition = canTransitionOrder({
    from: order.status as OrderStatus,
    to: "address_provided",
    actor: "buyer",
    hasShippingAddress: true,
  });

  if (!addressTransition.allowed) {
    return {
      ok: false,
      error:
        addressTransition.reason ??
        "Adresu už nie je možné odoslať v tomto stave objednávky.",
    };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "address_provided",
      shipping_address: address,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("thread_id", thread.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  if (input.saveAsDefault) {
    const { error: profileAddressError } = await supabase
      .from("profile_shipping_addresses")
      .upsert(
        {
          user_id: user.id,
          name: address.name,
          street: address.street,
          city: address.city,
          zip: address.zip,
          country: address.country,
          phone: address.phone ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (profileAddressError) {
      return { ok: false, error: profileAddressError.message };
    }
  }

  const listingStatus = getListingStatusForOrderTransition({
    nextOrderStatus: "address_provided",
    previousOrderStatus: order.status as OrderStatus,
  });
  const statusMessage = {
    thread_id: thread.id,
    sender_id: user.id,
    body: "Adresa odoslaná",
    message_type: "order_status",
    metadata: {
      order_id: order.id,
      order_status: "address_provided",
      listing_status: listingStatus,
    },
    attachments: [],
  };

  const addressMessage = {
    thread_id: thread.id,
    sender_id: user.id,
    body: formatAddressForThread(address),
    message_type: "system",
    metadata: {
      order_id: order.id,
      order_status: "address_provided",
      listing_status: listingStatus,
      kind: "shipping_address",
    },
    attachments: [],
  };

  const { error: insertMessageError } = await supabase
    .from("messages")
    .insert([statusMessage, addressMessage]);

  if (insertMessageError) {
    return { ok: false, error: insertMessageError.message };
  }

  revalidateOrderViews(thread.id, thread.listing_id);
  return { ok: true };
}

export async function markOrderShipped(
  threadId: string,
  trackingNumber?: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa." };

  const threadCtx = await getListingThreadContext(threadId, user.id);
  if (!threadCtx.ok) {
    return { ok: false, error: threadCtx.error };
  }

  const { supabase, thread, sellerId } = threadCtx;

  if (user.id !== sellerId) {
    return { ok: false, error: "Balíček môže označiť ako odoslaný iba predajca." };
  }

  const tracking = trackingNumber?.trim() || null;
  if (tracking && tracking.length > 120) {
    return { ok: false, error: "Tracking číslo je príliš dlhé." };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("thread_id", thread.id)
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, error: "Objednávka sa nenašla." };
  }

  const shippedTransition = canTransitionOrder({
    from: order.status as OrderStatus,
    to: "shipped",
    actor: "seller",
  });

  if (!shippedTransition.allowed) {
    return {
      ok: false,
      error:
        shippedTransition.reason ??
        "Balíček môžete označiť až po odoslaní adresy kupujúcim.",
    };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      tracking_number: tracking,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("thread_id", thread.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const listingStatus = getListingStatusForOrderTransition({
    nextOrderStatus: "shipped",
    previousOrderStatus: order.status as OrderStatus,
  });
  const messages: {
    thread_id: string;
    sender_id: string;
    body: string;
    message_type: "order_status" | "system";
    metadata: Record<string, unknown>;
    attachments: never[];
  }[] = [
    {
      thread_id: thread.id,
      sender_id: user.id,
      body: "Balíček odoslaný",
      message_type: "order_status",
      metadata: {
        order_id: order.id,
        order_status: "shipped",
        listing_status: listingStatus,
        ...(tracking ? { tracking_number: tracking } : {}),
      },
      attachments: [],
    },
  ];

  if (tracking) {
    messages.push({
      thread_id: thread.id,
      sender_id: user.id,
      body: `Tracking číslo: ${tracking}`,
      message_type: "system",
      metadata: {
        order_id: order.id,
        listing_status: listingStatus,
        kind: "tracking_number",
      },
      attachments: [],
    });
  }

  const { error: insertMessageError } = await supabase
    .from("messages")
    .insert(messages);

  if (insertMessageError) {
    return { ok: false, error: insertMessageError.message };
  }

  revalidateOrderViews(thread.id, thread.listing_id);
  return { ok: true };
}

export async function markOrderDelivered(threadId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Prihláste sa." };

  const threadCtx = await getListingThreadContext(threadId, user.id);
  if (!threadCtx.ok) {
    return { ok: false, error: threadCtx.error };
  }

  const { supabase, thread, buyerId } = threadCtx;

  if (user.id !== buyerId) {
    return { ok: false, error: "Doručenie môže potvrdiť iba kupujúci." };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("thread_id", thread.id)
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, error: "Objednávka sa nenašla." };
  }

  const deliveredTransition = canTransitionOrder({
    from: order.status as OrderStatus,
    to: "delivered",
    actor: "buyer",
  });

  if (!deliveredTransition.allowed) {
    return {
      ok: false,
      error:
        deliveredTransition.reason ??
        "Doručenie môžete potvrdiť až po označení balíčka ako odoslaného.",
    };
  }

  const deliveredAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      updated_at: deliveredAt,
    })
    .eq("id", order.id)
    .eq("thread_id", thread.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { error: threadUpdateError } = await supabase
    .from("threads")
    .update({
      order_delivered_at: deliveredAt,
      updated_at: deliveredAt,
    })
    .eq("id", thread.id);

  // Keep backward compatibility when the column does not exist yet.
  if (
    threadUpdateError &&
    !isMissingThreadOrderDeliveredAtColumnError(threadUpdateError)
  ) {
    return { ok: false, error: threadUpdateError.message };
  }

  const listingStatus = getListingStatusForOrderTransition({
    nextOrderStatus: "delivered",
    previousOrderStatus: order.status as OrderStatus,
  });
  const { error: messageError } = await supabase.from("messages").insert({
    thread_id: thread.id,
    sender_id: user.id,
    body: "Objednávka doručená",
    message_type: "order_status",
    metadata: {
      order_id: order.id,
      order_status: "delivered",
      listing_status: listingStatus,
    },
    attachments: [],
  });

  if (messageError) {
    return { ok: false, error: messageError.message };
  }

  revalidateOrderViews(thread.id, thread.listing_id);
  revalidatePath("/review");
  return { ok: true };
}
