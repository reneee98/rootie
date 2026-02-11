"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/auth";

export type SendMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export type SendMessageInput = {
  threadId: string;
  body: string;
  messageType?: "text" | "offer_price" | "offer_swap" | "system" | "order_status";
  metadata?: Record<string, unknown>;
  attachments?: { url: string; type?: string }[];
};

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

function sanitizeAttachments(
  raw: { url: string; type?: string }[] | undefined
): { url: string; type?: string }[] {
  return (raw ?? [])
    .map((att) => ({
      url: typeof att.url === "string" ? att.url.trim() : "",
      type: typeof att.type === "string" ? att.type.trim() : undefined,
    }))
    .filter((att) => att.url.length > 0);
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const next = item.trim();
    if (next) unique.add(next);
  }
  return [...unique];
}

export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResult> {
  const user = await requireUser("/inbox");
  const supabase = await createSupabaseServerClient();

  const threadId = typeof input.threadId === "string" ? input.threadId.trim() : "";
  if (!threadId) {
    return { ok: false, error: "Konverzácia neexistuje." };
  }

  const body = input.body?.trim() ?? "";

  // Rovnaký klient ako na stránke chat (session + RLS) – ak stránka vlákno načítala, tu ho nájdeme
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, user1_id, user2_id, context_type, listing_id")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) {
    console.error("sendMessage thread fetch error:", threadError.message, { threadId });
    return { ok: false, error: "Konverzácia neexistuje." };
  }

  const isParticipant =
    thread &&
    (thread.user1_id === user.id || thread.user2_id === user.id);

  if (!thread || !isParticipant) {
    console.error("sendMessage: thread not found or user not participant", {
      threadId,
      userId: user.id,
      hasThread: !!thread,
    });
    return { ok: false, error: "Konverzácia neexistuje." };
  }

  const otherId =
    thread.user1_id === user.id ? thread.user2_id : thread.user1_id;
  const { data: blocked } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", otherId)
    .eq("blocked_id", user.id)
    .maybeSingle();

  if (blocked) {
    return { ok: false, error: "Tento používateľ vás zablokoval." };
  }

  const messageType = input.messageType ?? "text";
  const metadata = input.metadata ?? {};
  const attachments = sanitizeAttachments(input.attachments);

  let listingSellerId: string | null = null;
  let listingType: "fixed" | "auction" | null = null;
  let listingStatus: string | null = null;
  let listingBuyerId: string | null = null;
  let listingWinningBidderId: string | null = null;
  let buyerHasOfferInThread = false;

  if (thread.context_type === "listing" && thread.listing_id) {
    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id, type, status")
      .eq("id", thread.listing_id)
      .maybeSingle();
    listingSellerId = listing?.seller_id ?? null;
    listingType =
      listing?.type === "fixed" || listing?.type === "auction"
        ? (listing.type as "fixed" | "auction")
        : null;
    listingStatus = typeof listing?.status === "string" ? listing.status : null;

    if (listingSellerId) {
      listingBuyerId =
        thread.user1_id === listingSellerId ? thread.user2_id : thread.user1_id;
      const { data: buyerOfferRows } = await supabase
        .from("messages")
        .select("id")
        .eq("thread_id", threadId)
        .eq("sender_id", listingBuyerId)
        .in("message_type", ["offer_price", "offer_swap"])
        .limit(1);
      buyerHasOfferInThread = Boolean(buyerOfferRows?.length);
    }

    if (listingType === "auction" && listingStatus === "sold") {
      const { data: winningRows } = await supabase
        .from("bids")
        .select("bidder_id")
        .eq("listing_id", thread.listing_id)
        .order("amount", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);
      listingWinningBidderId = winningRows?.[0]?.bidder_id ?? null;
    }
  }

  const isListingThread = thread.context_type === "listing";
  const isSellerInListingThread = Boolean(
    isListingThread && listingSellerId === user.id
  );
  const isBuyerInListingThread = Boolean(
    isListingThread && listingSellerId && listingSellerId !== user.id
  );

  const canSendRegularListingMessage = (() => {
    if (!isListingThread || !listingSellerId || !listingType) return true;

    if (listingType === "auction") {
      const participantsMatchWinner =
        Boolean(listingWinningBidderId) &&
        listingWinningBidderId === listingBuyerId;
      return listingStatus === "sold" && participantsMatchWinner;
    }

    return buyerHasOfferInThread;
  })();

  let normalizedBody = body;
  let normalizedMetadata: Record<string, unknown> = {};
  let normalizedAttachments = attachments;

  if (messageType === "text") {
    if (isListingThread && !canSendRegularListingMessage) {
      if (listingType === "auction") {
        return { ok: false, error: "V aukcii môžete písať do chatu až po výhre aukcie." };
      }
      return {
        ok: false,
        error: "Do chatu môžete písať až po odoslaní ponuky (cena alebo výmena).",
      };
    }
    if (!body && attachments.length === 0) {
      return { ok: false, error: "Správa alebo príloha je povinná." };
    }
  } else if (messageType === "offer_price") {
    if (!isListingThread || !listingSellerId) {
      return { ok: false, error: "Ponuku ceny je možné poslať len v chate k inzerátu." };
    }
    if (listingType === "auction") {
      return { ok: false, error: "V aukcii neodosielajte ponuku cez chat. Použite príhoz." };
    }
    const amount =
      parsePositiveAmount(metadata["amount_eur"]) ??
      parsePositiveAmount(metadata["amount"]) ??
      parsePositiveAmount(body);
    if (amount == null) {
      return { ok: false, error: "Zadajte platnú sumu." };
    }

    const counterTo =
      typeof metadata["counter_to_message_id"] === "string"
        ? metadata["counter_to_message_id"].trim()
        : "";

    if (isSellerInListingThread) {
      if (!counterTo) {
        return {
          ok: false,
          error: "Predajca môže poslať cenu len ako protiponuku na existujúcu ponuku.",
        };
      }

      const { data: originalOffer } = await supabase
        .from("messages")
        .select("id, sender_id, message_type")
        .eq("id", counterTo)
        .eq("thread_id", threadId)
        .maybeSingle();

      if (
        !originalOffer ||
        originalOffer.sender_id === user.id ||
        !["offer_price", "offer_swap"].includes(
          String(originalOffer.message_type ?? "")
        )
      ) {
        return { ok: false, error: "Pôvodná ponuka pre protiponuku sa nenašla." };
      }

      normalizedMetadata = {
        amount_eur: amount,
        counter_to_message_id: counterTo,
      };
    } else if (isBuyerInListingThread) {
      if (counterTo) {
        return { ok: false, error: "Kupujúci nemôže poslať protiponuku." };
      }
      normalizedMetadata = { amount_eur: amount };
    } else {
      return { ok: false, error: "Nemáte oprávnenie poslať ponuku ceny." };
    }

    normalizedBody = body || String(amount);
    normalizedAttachments = [];
  } else if (messageType === "offer_swap") {
    if (!isBuyerInListingThread) {
      return { ok: false, error: "Ponuku výmeny môže v tomto chate poslať iba kupujúci." };
    }
    if (listingType === "auction") {
      return { ok: false, error: "V aukcii nie je možné posielať ponuku výmeny cez chat." };
    }

    const swapForTextCandidate =
      typeof metadata["swap_for_text"] === "string"
        ? metadata["swap_for_text"]
        : body;
    const swapForText = swapForTextCandidate.trim();
    if (!swapForText) {
      return { ok: false, error: "Popíšte, čo ponúkate na výmenu." };
    }

    const photoUrls = Array.from(
      new Set([
        ...sanitizeStringArray(metadata["photo_urls"]),
        ...attachments.map((att) => att.url),
      ])
    );

    normalizedMetadata = {
      swap_for_text: swapForText,
      ...(photoUrls.length > 0 ? { photo_urls: photoUrls } : {}),
    };
    normalizedBody = swapForText;
  } else if (messageType === "system" || messageType === "order_status") {
    if (!isSellerInListingThread) {
      return { ok: false, error: "Takúto správu môže odoslať iba predajca." };
    }
    if (isListingThread && !canSendRegularListingMessage) {
      if (listingType === "auction") {
        return { ok: false, error: "V aukcii môžete písať do chatu až po výhre aukcie." };
      }
      return {
        ok: false,
        error: "Do chatu môžete písať až po odoslaní ponuky (cena alebo výmena).",
      };
    }
    if (!body) {
      return { ok: false, error: "Text správy je povinný." };
    }
    normalizedMetadata = metadata;
    normalizedAttachments = [];
  } else {
    return { ok: false, error: "Nepodporovaný typ správy." };
  }

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      body: normalizedBody || " ",
      message_type: messageType,
      metadata: normalizedMetadata,
      attachments: normalizedAttachments,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Message insert error:", error);
    const message =
      error.code === "23503"
        ? "Konverzácia alebo používateľ už neexistuje."
        : error.code === "42501" || error.message?.includes("policy")
          ? "Nemáte oprávnenie odoslať správu (možno vás druhá strana zablokovala)."
          : error.message ?? "Nepodarilo sa odoslať správu.";
    return { ok: false, error: message };
  }

  revalidatePath("/inbox");
  revalidatePath(`/chat/${threadId}`);

  return { ok: true, messageId: msg.id };
}

export async function markThreadRead(threadId: string) {
  const user = await requireUser("/inbox");
  const supabase = await createSupabaseServerClient();

  await supabase.from("thread_reads").upsert(
    {
      thread_id: threadId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "thread_id,user_id" }
  );
}
