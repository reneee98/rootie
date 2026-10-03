"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Euro, Info } from "lucide-react";

import { sendMessage } from "@/lib/actions/chat";
import {
  acceptListingPriceOffer,
  acceptListingSwapOffer,
  declineListingOffer,
} from "@/lib/actions/orders";
import type { ChatMessage } from "@/lib/data/chat";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type MessageBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
  threadId: string;
  canManageOffers?: boolean;
  canAcceptPriceCounter?: boolean;
  dealConfirmed?: boolean;
  isListingThread?: boolean;
  onOrderStateChanged?: () => void;
  onSent?: () => void;
};

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    if (!value.trim()) return null;
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

const offerAmountFormatter = new Intl.NumberFormat("sk-SK", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatOfferAmount(value: number): string {
  return offerAmountFormatter.format(value);
}

function getOfferAmount(message: ChatMessage): number | null {
  return (
    parseAmount(message.metadata?.amount_eur) ??
    parseAmount(message.metadata?.amount) ??
    parseAmount(message.body)
  );
}

function getSwapText(message: ChatMessage): string {
  if (typeof message.metadata?.swap_for_text === "string") {
    const value = message.metadata.swap_for_text.trim();
    if (value) return value;
  }
  return message.body;
}

function getSwapPhotoUrls(message: ChatMessage): string[] {
  const fromMetadata = Array.isArray(message.metadata?.photo_urls)
    ? message.metadata.photo_urls.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    : [];
  const fromAttachments = message.attachments
    .map((att) => att.url)
    .filter((value) => typeof value === "string" && value.trim().length > 0);

  return Array.from(new Set([...fromMetadata, ...fromAttachments]));
}

export function MessageBubble({
  message,
  isOwn,
  threadId,
  canManageOffers = false,
  canAcceptPriceCounter = false,
  dealConfirmed = false,
  isListingThread = false,
  onOrderStateChanged,
  onSent,
}: MessageBubbleProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPriceCounterInput, setShowPriceCounterInput] = useState(false);
  const [showSwapCounterInput, setShowSwapCounterInput] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [swapCounterText, setSwapCounterText] = useState("");
  const pendingRef = useRef(false);

  const isPriceCounter = message.message_type === "offer_price" &&
    typeof message.metadata?.counter_to_message_id === "string";
  const canActOnOffer = (canManageOffers || (canAcceptPriceCounter && isPriceCounter)) && !isOwn && !dealConfirmed;

  const performOfferAction = async (action: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setError("");
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Akciu sa nepodarilo vykonať.");
        return false;
      }
      onOrderStateChanged?.();
      onSent?.();
      return true;
    } catch {
      setError("Akciu sa nepodarilo vykonať. Skúste to znova.");
      return false;
    } finally {
      setPending(false);
      pendingRef.current = false;
    }
  };

  const handleAccept = async () => {
    if (!canActOnOffer || !isListingThread) return;
    const ok = await performOfferAction(() => message.message_type === "offer_price"
      ? acceptListingPriceOffer(threadId, message.id)
      : acceptListingSwapOffer(threadId, message.id));
    if (!ok) return;

    setShowPriceCounterInput(false);
    setShowSwapCounterInput(false);
    setCounterAmount("");
    setSwapCounterText("");
  };

  const handleDecline = async () => {
    if (!canActOnOffer || !isListingThread) return;
    const ok = await performOfferAction(() => declineListingOffer(threadId, message.id));
    if (!ok) return;

    setShowPriceCounterInput(false);
    setShowSwapCounterInput(false);
    setCounterAmount("");
    setSwapCounterText("");
  };

  const handleCounterPrice = async () => {
    const amount = parseAmount(counterAmount);
    if (amount == null || amount <= 0) {
      setError("Zadajte platnú sumu.");
      return;
    }

    if (!canActOnOffer || !canManageOffers) return;
    const ok = await performOfferAction(() => sendMessage({
      threadId,
      body: String(amount),
      messageType: "offer_price",
      metadata: {
        amount_eur: amount,
        counter_to_message_id: message.id,
      },
    }));
    if (!ok) return;

    setShowPriceCounterInput(false);
    setCounterAmount("");
  };

  const handleCounterSwapText = async () => {
    const text = swapCounterText.trim();
    if (!text) {
      setError("Napíšte návrh inej výmeny.");
      return;
    }

    if (!canActOnOffer || !canManageOffers) return;
    const ok = await performOfferAction(() => sendMessage({
      threadId,
      body: text,
      messageType: "text",
    }));
    if (!ok) return;

    setShowSwapCounterInput(false);
    setSwapCounterText("");
  };

  if (message.message_type === "system" || message.message_type === "order_status") {
    return (
      <div className="flex justify-center py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
            message.message_type === "order_status"
              ? "bg-emerald-100 text-emerald-900"
              : "bg-muted text-muted-foreground"
          )}
        >
          {message.message_type === "order_status" ? (
            <CheckCircle2 className="size-3" aria-hidden />
          ) : (
            <Info className="size-3" aria-hidden />
          )}
          {message.body}
        </span>
      </div>
    );
  }

  if (message.message_type === "offer_price") {
    const amount = getOfferAmount(message);
    const isCounterOffer =
      typeof message.metadata?.counter_to_message_id === "string" ||
      message.metadata?.is_counter_offer === true;

    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-2.5",
            isOwn
              ? "rounded-br-md bg-[#4f5826] text-white"
              : "rounded-bl-md border border-emerald-300 bg-emerald-50 text-emerald-950"
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
            <Euro className="size-3" aria-hidden />
            {isCounterOffer ? "Protiponuka" : "Ponuka ceny"}
          </div>

          <p className="text-lg font-semibold">
            {amount != null ? formatOfferAmount(amount) : message.body}
          </p>

          <time className="text-[10px] opacity-70" dateTime={message.created_at}>
            {formatDateTime(message.created_at)}
          </time>

          {canActOnOffer && (
            <div className="mt-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void handleAccept();
                  }}
                  disabled={pending}
                >
                  Súhlasím
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleDecline();
                  }}
                  disabled={pending}
                >
                  Nesúhlasím
                </Button>
                {canManageOffers && <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowPriceCounterInput((prev) => !prev);
                    setShowSwapCounterInput(false);
                    setError("");
                  }}
                  disabled={pending}
                >
                  Navrhnúť inú cenu
                </Button>}
              </div>

              {showPriceCounterInput && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step={0.01}
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="Suma (€)"
                    className="rootie-field h-11 w-32 px-2 text-foreground"
                    disabled={pending}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void handleCounterPrice();
                    }}
                    disabled={pending || !counterAmount.trim()}
                  >
                    Odoslať
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  if (message.message_type === "offer_swap") {
    const swapText = getSwapText(message);
    const photoUrls = getSwapPhotoUrls(message);

    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-2.5",
            isOwn
              ? "rounded-br-md bg-[#4f5826] text-white"
              : "rounded-bl-md border border-amber-300 bg-amber-50 text-amber-950"
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
            <ArrowLeftRight className="size-3" aria-hidden />
            Ponuka výmeny
          </div>

          <p className="whitespace-pre-wrap break-words text-sm">{swapText}</p>

          {photoUrls.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {photoUrls.map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded-lg border border-white/20"
                >
                  <Image
                    width={80}
                    height={80}
                    src={url}
                    alt=""
                    className="h-20 w-20 object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          <time className="text-[10px] opacity-70" dateTime={message.created_at}>
            {formatDateTime(message.created_at)}
          </time>

          {canActOnOffer && (
            <div className="mt-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void handleAccept();
                  }}
                  disabled={pending}
                >
                  Súhlasím
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleDecline();
                  }}
                  disabled={pending}
                >
                  Nesúhlasím
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowSwapCounterInput((prev) => !prev);
                    setShowPriceCounterInput(false);
                    setError("");
                  }}
                  disabled={pending}
                >
                  Navrhnúť inú výmenu
                </Button>
              </div>

              {showSwapCounterInput && (
                <div className="space-y-2">
                  <textarea
                    value={swapCounterText}
                    onChange={(e) => setSwapCounterText(e.target.value)}
                    placeholder="Napíšte návrh inej výmeny…"
                    rows={2}
                    className="rootie-textarea w-full resize-none px-2 py-1.5 text-foreground"
                    disabled={pending}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void handleCounterSwapText();
                    }}
                    disabled={pending || !swapCounterText.trim()}
                  >
                    Odoslať návrh
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-4 py-2.5",
          isOwn
            ? "rounded-br-md bg-[#4f5826] text-white"
            : "rounded-bl-md border border-[#e9e2d1] bg-[#faf8f4] text-[#232711]"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        {message.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="overflow-hidden rounded-lg border border-white/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- variable-size attachment, next/image requires fixed dimensions */}
                <img
                  src={att.url}
                  alt=""
                  className="max-h-32 w-auto max-w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
        <time className="text-[10px] opacity-70" dateTime={message.created_at}>
          {formatDateTime(message.created_at)}
        </time>
      </div>
    </div>
  );
}
