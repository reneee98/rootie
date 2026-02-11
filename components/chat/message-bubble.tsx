"use client";

import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Euro, Info } from "lucide-react";

import { sendMessage } from "@/lib/actions/chat";
import {
  acceptListingPriceOffer,
  acceptListingSwapOffer,
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
  dealConfirmed?: boolean;
  isListingThread?: boolean;
  onOrderStateChanged?: () => void;
  onSent?: () => void;
};

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
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

  const canActOnOffer = canManageOffers && !isOwn && !dealConfirmed;

  const handleAccept = async () => {
    setError("");
    setPending(true);

    const result =
      isListingThread && message.message_type === "offer_price"
        ? await acceptListingPriceOffer(threadId, message.id)
        : isListingThread && message.message_type === "offer_swap"
          ? await acceptListingSwapOffer(threadId, message.id)
        : await sendMessage({
            threadId,
            body: "Ponuka výmeny odsúhlasená",
            messageType: "system",
            metadata: { source_offer_message_id: message.id },
          });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setShowPriceCounterInput(false);
    setShowSwapCounterInput(false);
    setCounterAmount("");
    setSwapCounterText("");
    onOrderStateChanged?.();
    onSent?.();
  };

  const handleDecline = async () => {
    setError("");
    setPending(true);

    const result = await sendMessage({
      threadId,
      body: "Ponuka odmietnutá",
      messageType: "system",
      metadata: { source_offer_message_id: message.id },
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setShowPriceCounterInput(false);
    setShowSwapCounterInput(false);
    setCounterAmount("");
    setSwapCounterText("");
    onSent?.();
  };

  const handleCounterPrice = async () => {
    const amount = parseAmount(counterAmount);
    if (amount == null || amount <= 0) {
      setError("Zadajte platnú sumu.");
      return;
    }

    setError("");
    setPending(true);

    const result = await sendMessage({
      threadId,
      body: String(amount),
      messageType: "offer_price",
      metadata: {
        amount_eur: amount,
        counter_to_message_id: message.id,
      },
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setShowPriceCounterInput(false);
    setCounterAmount("");
    onSent?.();
  };

  const handleCounterSwapText = async () => {
    const text = swapCounterText.trim();
    if (!text) {
      setError("Napíšte návrh inej výmeny.");
      return;
    }

    setError("");
    setPending(true);

    const result = await sendMessage({
      threadId,
      body: text,
      messageType: "text",
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setShowSwapCounterInput(false);
    setSwapCounterText("");
    onSent?.();
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
              ? "bg-primary text-primary-foreground rounded-br-md"
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
                <Button
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
                </Button>
              </div>

              {showPriceCounterInput && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="Suma (€)"
                    className="border-input bg-background h-11 w-32 rounded-md border px-2 text-sm text-foreground"
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

          {error && <p className="text-xs text-destructive">{error}</p>}
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
              ? "bg-primary text-primary-foreground rounded-br-md"
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
                  <img
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
                    className="border-input bg-background w-full resize-none rounded-md border px-2 py-1.5 text-sm text-foreground"
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
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
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
