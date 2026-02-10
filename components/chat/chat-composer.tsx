"use client";

import { useState, useRef } from "react";
import { Send, Euro, ArrowLeftRight, ImagePlus, X, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessage, type SendMessageInput } from "@/lib/actions/chat";

type ChatComposerProps = {
  threadId: string;
  onSent?: () => void;
  uploadImageUrl?: (file: File) => Promise<string>;
  /** True when this is a listing thread and current user is the seller (only seller sees Protiponuka / Nesúhlasím) */
  isSellerInListingThread?: boolean;
  /** When true, hide Protiponuka/Nesúhlasím and Ponuka ceny/výmeny (only text input) */
  dealConfirmed?: boolean;
};

export function ChatComposer({
  threadId,
  onSent,
  uploadImageUrl,
  isSellerInListingThread = false,
  dealConfirmed = false,
}: ChatComposerProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; type?: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [quickAction, setQuickAction] = useState<
    "none" | "offer_price" | "offer_swap" | "counter_offer" | "reject_offer"
  >("none");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSwapText, setOfferSwapText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendText = async () => {
    const text = body.trim();
    if (!text && attachments.length === 0) return;
    setError("");
    setPending(true);
    const result = await sendMessage({
      threadId,
      body: text,
      messageType: "text",
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setAttachments([]);
    onSent?.();
  };

  const handleSendOfferPrice = async () => {
    const amount = parseFloat(offerAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setError("Zadajte platnú sumu.");
      return;
    }
    setError("");
    setPending(true);
    const result = await sendMessage({
      threadId,
      body: offerAmount,
      messageType: "offer_price",
      metadata: { amount },
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuickAction("none");
    setOfferAmount("");
    onSent?.();
  };

  const handleSendOfferSwap = async () => {
    const text = offerSwapText.trim() || "Ponúkam výmenu.";
    setError("");
    setPending(true);
    const result = await sendMessage({
      threadId,
      body: text,
      messageType: "offer_swap",
      metadata: {},
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuickAction("none");
    setOfferSwapText("");
    onSent?.();
  };

  const handleSendCounterOffer = async () => {
    const amount = parseFloat(offerAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setError("Zadajte platnú sumu.");
      return;
    }
    setError("");
    setPending(true);
    const result = await sendMessage({
      threadId,
      body: String(amount),
      messageType: "offer_price",
      metadata: { amount, is_counter_offer: true },
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuickAction("none");
    setOfferAmount("");
    onSent?.();
  };

  const handleRejectOffer = async () => {
    setError("");
    setPending(true);
    const result = await sendMessage({
      threadId,
      body: "Predajca nesúhlasí s ponukou.",
      messageType: "system",
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuickAction("none");
    onSent?.();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadImageUrl) return;
    try {
      const url = await uploadImageUrl(file);
      setAttachments((prev) => [...prev, { url, type: "image" }]);
    } catch {
      setError("Nepodarilo sa nahrať obrázok.");
    }
    e.target.value = "";
  };

  return (
    <div className="bg-background border-t p-3 pb-[env(safe-area-inset-bottom)]">
      {/* Quick action panels */}
      {quickAction === "offer_price" && !isSellerInListingThread && !dealConfirmed && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Euro className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ponuka ceny</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Suma (€)"
              className="border-input bg-background h-10 flex-1 rounded-lg border px-3 text-sm"
            />
            <Button
              size="sm"
              onClick={handleSendOfferPrice}
              disabled={pending || !offerAmount}
            >
              Odoslať
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQuickAction("none")}
            >
              Zrušiť
            </Button>
          </div>
        </div>
      )}

      {quickAction === "counter_offer" && isSellerInListingThread && !dealConfirmed && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Euro className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Moja cena</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Suma (€)"
              className="border-input bg-background h-10 flex-1 rounded-lg border px-3 text-sm"
            />
            <Button
              size="sm"
              onClick={handleSendCounterOffer}
              disabled={pending || !offerAmount}
            >
              Odoslať
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQuickAction("none")}
            >
              Zrušiť
            </Button>
          </div>
        </div>
      )}

      {quickAction === "offer_swap" && !isSellerInListingThread && !dealConfirmed && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ponuka výmeny</span>
          </div>
          <textarea
            value={offerSwapText}
            onChange={(e) => setOfferSwapText(e.target.value)}
            placeholder="Popíšte, čo ponúkate na výmenu…"
            rows={2}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSendOfferSwap}
              disabled={pending}
            >
              Odoslať
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQuickAction("none")}
            >
              Zrušiť
            </Button>
          </div>
        </div>
      )}

      {/* Quick action buttons — hidden when deal is confirmed */}
      {quickAction === "none" && !dealConfirmed && (
        <div className="mb-2 flex flex-wrap gap-2">
          {isSellerInListingThread ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setQuickAction("counter_offer")}
              >
                <Euro className="size-3.5" />
                Protiponuka
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleRejectOffer}
                disabled={pending}
              >
                <ThumbsDown className="size-3.5" />
                Nesúhlasím s ponukou
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setQuickAction("offer_price")}
              >
                <Euro className="size-3.5" />
                Ponuka ceny
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setQuickAction("offer_swap")}
              >
                <ArrowLeftRight className="size-3.5" />
                Ponuka výmeny
              </Button>
            </>
          )}
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {attachments.map((att, i) => (
            <div key={i} className="relative shrink-0">
              <img
                src={att.url}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
              <button
                type="button"
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label="Odstrániť"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input */}
      <div className="flex gap-2">
        {uploadImageUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-full border border-input transition-colors"
            aria-label="Pridať obrázok"
          >
            <ImagePlus className="size-5" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendText();
            }
          }}
          placeholder="Napíšte správu…"
          rows={1}
          className="border-input bg-background min-h-10 flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          disabled={pending}
        />
        <Button
          type="button"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          onClick={handleSendText}
          disabled={pending || (!body.trim() && attachments.length === 0)}
          aria-label="Odoslať"
        >
          <Send className="size-4" />
        </Button>
      </div>

      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
