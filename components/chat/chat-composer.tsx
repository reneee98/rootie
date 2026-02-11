"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, Euro, ImagePlus, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { sendMessage } from "@/lib/actions/chat";

type ChatComposerProps = {
  threadId: string;
  currentUserId: string;
  onSent?: () => void;
  uploadImageUrl?: (file: File) => Promise<string>;
  /** Show buyer actions (Ponuka ceny / Ponuka výmeny) only in listing thread for non-seller. */
  canBuyerSendOffers?: boolean;
  /** Hide buyer offer actions when deal is already confirmed. */
  dealConfirmed?: boolean;
  /** For optimistic UI: add a temporary message before server responds */
  addOptimisticMessage?: (msg: Omit<import("@/lib/data/chat").ChatMessage, "id">) => string;
  /** Remove optimistic message on error */
  removeOptimisticMessage?: (tempId: string) => void;
};

export function ChatComposer({
  threadId,
  currentUserId,
  onSent,
  uploadImageUrl,
  canBuyerSendOffers = false,
  dealConfirmed = false,
  addOptimisticMessage,
  removeOptimisticMessage,
}: ChatComposerProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; type?: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [priceOfferOpen, setPriceOfferOpen] = useState(false);
  const [swapOfferOpen, setSwapOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSwapText, setOfferSwapText] = useState("");
  const [swapPhotos, setSwapPhotos] = useState<{ url: string; type?: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const swapPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleSendText = async () => {
    const text = body.trim();
    if (!text && attachments.length === 0) return;

    setError("");
    setPending(true);

    const attachmentsToSend = attachments.length > 0 ? attachments : undefined;
    const tempId =
      addOptimisticMessage?.({
        thread_id: threadId,
        sender_id: currentUserId,
        body: text || " ",
        message_type: "text",
        metadata: {},
        attachments: attachmentsToSend ?? [],
        created_at: new Date().toISOString(),
      });

    const result = await sendMessage({
      threadId,
      body: text,
      messageType: "text",
      attachments: attachmentsToSend,
    });

    setPending(false);
    if (!result.ok) {
      if (tempId && removeOptimisticMessage) removeOptimisticMessage(tempId);
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
      body: String(amount),
      messageType: "offer_price",
      metadata: { amount_eur: amount },
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOfferAmount("");
    setPriceOfferOpen(false);
    onSent?.();
  };

  const handleSendOfferSwap = async () => {
    const text = offerSwapText.trim();
    if (!text) {
      setError("Popíšte, čo ponúkate na výmenu.");
      return;
    }

    const photoUrls = swapPhotos.map((photo) => photo.url);

    setError("");
    setPending(true);
    const result = await sendMessage({
      threadId,
      body: text,
      messageType: "offer_swap",
      metadata: {
        swap_for_text: text,
        ...(photoUrls.length > 0 ? { photo_urls: photoUrls } : {}),
      },
      attachments: swapPhotos.length > 0 ? swapPhotos : undefined,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOfferSwapText("");
    setSwapPhotos([]);
    setSwapOfferOpen(false);
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

  const handleSwapPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadImageUrl) return;

    try {
      const url = await uploadImageUrl(file);
      setSwapPhotos((prev) => [...prev, { url, type: "image" }]);
    } catch {
      setError("Nepodarilo sa nahrať obrázok.");
    }

    e.target.value = "";
  };

  return (
    <div className="bg-background border-t p-3 pb-[env(safe-area-inset-bottom)]">
      {!dealConfirmed && canBuyerSendOffers && (
        <div className="mb-2 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              setError("");
              setPriceOfferOpen(true);
            }}
            disabled={pending}
          >
            <Euro className="size-3.5" />
            Ponuka ceny
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              setError("");
              setSwapOfferOpen(true);
            }}
            disabled={pending}
          >
            <ArrowLeftRight className="size-3.5" />
            Ponuka výmeny
          </Button>
        </div>
      )}

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
                className="absolute -right-3 -top-3 flex size-11 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
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

      <div className="flex gap-2">
        {uploadImageUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-full border border-input transition-colors"
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
              void handleSendText();
            }
          }}
          placeholder="Napíšte správu…"
          rows={1}
          className="border-input bg-background min-h-11 flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          disabled={pending}
        />

        <Button
          type="button"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          onClick={() => {
            void handleSendText();
          }}
          disabled={pending || (!body.trim() && attachments.length === 0)}
          aria-label="Odoslať"
        >
          <Send className="size-4" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}

      <Drawer open={priceOfferOpen} onOpenChange={setPriceOfferOpen} direction="bottom">
        <DrawerContent className="max-h-[90vh] rounded-t-2xl">
          <DrawerHeader className="pb-2 text-center">
            <DrawerTitle>Ponuka ceny</DrawerTitle>
            <DrawerDescription>Zadajte sumu v EUR.</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-4 pb-2">
            <label htmlFor="offer-price-amount" className="text-sm font-medium">
              Suma (EUR)
            </label>
            <input
              id="offer-price-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0"
              className="border-input bg-background h-11 w-full rounded-lg border px-3 text-sm"
              disabled={pending}
            />
          </div>

          <DrawerFooter>
            <Button
              type="button"
              onClick={() => {
                void handleSendOfferPrice();
              }}
              disabled={pending || !offerAmount.trim()}
            >
              Odoslať ponuku ceny
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPriceOfferOpen(false)}
              disabled={pending}
            >
              Zrušiť
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={swapOfferOpen} onOpenChange={setSwapOfferOpen} direction="bottom">
        <DrawerContent className="max-h-[90vh] rounded-t-2xl">
          <DrawerHeader className="pb-2 text-center">
            <DrawerTitle>Ponuka výmeny</DrawerTitle>
            <DrawerDescription>
              Za čo to chceš vymeniť?
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-4 pb-2">
            <label htmlFor="offer-swap-text" className="text-sm font-medium">
              Za čo to chceš vymeniť?
            </label>
            <textarea
              id="offer-swap-text"
              value={offerSwapText}
              onChange={(e) => setOfferSwapText(e.target.value)}
              placeholder="Napríklad: Filodendron + doplatok."
              rows={3}
              className="border-input bg-background w-full resize-none rounded-lg border px-3 py-2 text-sm"
              disabled={pending}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Pridať fotku</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => swapPhotoInputRef.current?.click()}
                  disabled={pending || !uploadImageUrl}
                >
                  <ImagePlus className="size-4" />
                  Pridať fotku
                </Button>
              </div>

              <input
                ref={swapPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSwapPhotoChange}
              />

              {swapPhotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {swapPhotos.map((photo, i) => (
                    <div key={`${photo.url}-${i}`} className="relative shrink-0">
                      <img
                        src={photo.url}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -right-3 -top-3 flex size-11 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                        onClick={() =>
                          setSwapPhotos((prev) => prev.filter((_, j) => j !== i))
                        }
                        aria-label="Odstrániť"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              onClick={() => {
                void handleSendOfferSwap();
              }}
              disabled={pending || !offerSwapText.trim()}
            >
              Odoslať ponuku výmeny
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSwapOfferOpen(false)}
              disabled={pending}
            >
              Zrušiť
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
