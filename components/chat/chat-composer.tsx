"use client";

import Image from "next/image";
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
import { sendMessage, type SendMessageInput } from "@/lib/actions/chat";

type ChatComposerProps = {
  threadId: string;
  currentUserId: string;
  onSent?: () => void;
  uploadImageUrl?: (file: File) => Promise<string>;
  /** Show buyer actions (Ponuka ceny / Ponuka výmeny) only in listing thread for non-seller. */
  canBuyerSendOffers?: boolean;
  canBuyerSendSwapOffers?: boolean;
  /** Hide buyer offer actions when deal is already confirmed. */
  dealConfirmed?: boolean;
  /** Allow regular text/attachment chat messages. */
  textMessagingEnabled?: boolean;
  /** Human-readable reason shown when text chat is disabled. */
  textMessagingDisabledReason?: string;
  /** For optimistic UI: add a temporary message before server responds */
  addOptimisticMessage?: (msg: Omit<import("@/lib/data/chat").ChatMessage, "id">) => string;
  /** Remove optimistic message on error */
  removeOptimisticMessage?: (tempId: string) => void;
  confirmOptimisticMessage?: (tempId: string, messageId: string, createdAt: string) => void;
};

export function ChatComposer({
  threadId,
  currentUserId,
  onSent,
  uploadImageUrl,
  canBuyerSendOffers = false,
  canBuyerSendSwapOffers = false,
  dealConfirmed = false,
  textMessagingEnabled = true,
  textMessagingDisabledReason,
  addOptimisticMessage,
  removeOptimisticMessage,
  confirmOptimisticMessage,
}: ChatComposerProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; type?: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [priceOfferOpen, setPriceOfferOpen] = useState(false);
  const [swapOfferOpen, setSwapOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSwapText, setOfferSwapText] = useState("");
  const [swapPhotos, setSwapPhotos] = useState<{ url: string; type?: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const swapPhotoInputRef = useRef<HTMLInputElement>(null);
  /** Guards against double-send when user clicks/taps rapidly or hits Enter twice. */
  const sendingRef = useRef(false);
  const uploadingRef = useRef(false);
  const textChatLocked = !textMessagingEnabled;
  const textChatLockMessage =
    textMessagingDisabledReason ??
    "Písanie v chate bude dostupné po splnení podmienok konverzácie.";

  const submitMessage = async (input: SendMessageInput, tempId?: string): Promise<boolean> => {
    sendingRef.current = true;
    setPending(true);
    setError("");
    try {
      const result = await sendMessage(input);
      if (!result.ok) {
        if (tempId) removeOptimisticMessage?.(tempId);
        setError(result.error);
        return false;
      }
      if (tempId) confirmOptimisticMessage?.(tempId, result.messageId, result.createdAt);
      onSent?.();
      return true;
    } catch {
      if (tempId) removeOptimisticMessage?.(tempId);
      setError("Správu sa nepodarilo odoslať. Skontrolujte pripojenie a skúste to znova.");
      return false;
    } finally {
      setPending(false);
      sendingRef.current = false;
    }
  };

  const handleSendText = async () => {
    if (sendingRef.current || uploadingRef.current) return;
    if (textChatLocked) {
      setError(textChatLockMessage);
      return;
    }

    const text = body.trim();
    if (!text && attachments.length === 0) return;

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

    const sent = await submitMessage({
      threadId,
      body: text,
      messageType: "text",
      attachments: attachmentsToSend,
    }, tempId);
    if (!sent) return;

    setBody("");
    setAttachments([]);
  };

  const handleSendOfferPrice = async () => {
    if (sendingRef.current || uploadingRef.current || dealConfirmed || !canBuyerSendOffers) return;
    const amount = Number(offerAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0.01) {
      setError("Zadajte platnú sumu.");
      return;
    }

    const sent = await submitMessage({
      threadId,
      body: String(amount),
      messageType: "offer_price",
      metadata: { amount_eur: amount },
    });
    if (!sent) return;

    setOfferAmount("");
    setPriceOfferOpen(false);
  };

  const handleSendOfferSwap = async () => {
    if (sendingRef.current || uploadingRef.current || dealConfirmed || !canBuyerSendSwapOffers) return;
    const text = offerSwapText.trim();
    if (!text) {
      setError("Popíšte, čo ponúkate na výmenu.");
      return;
    }

    const photoUrls = swapPhotos.map((photo) => photo.url);

    const sent = await submitMessage({
      threadId,
      body: text,
      messageType: "offer_swap",
      metadata: {
        swap_for_text: text,
        ...(photoUrls.length > 0 ? { photo_urls: photoUrls } : {}),
      },
      attachments: swapPhotos.length > 0 ? swapPhotos : undefined,
    });
    if (!sent) return;

    setOfferSwapText("");
    setSwapPhotos([]);
    setSwapOfferOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (textChatLocked) {
      setError(textChatLockMessage);
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadPhoto(file, false);
  };

  const handleSwapPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadPhoto(file, true);
  };

  const uploadPhoto = async (file: File, swap: boolean) => {
    if (!uploadImageUrl || sendingRef.current || uploadingRef.current) return;
    if ((swap ? swapPhotos : attachments).length >= 10) {
      setError("K jednej správe môžete pridať najviac 10 obrázkov.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("Vyberte obrázok JPG, PNG, WebP, GIF alebo AVIF do 10 MB.");
      return;
    }
    uploadingRef.current = true;
    setUploading(true);
    setError("");

    try {
      const url = await uploadImageUrl(file);
      const setPhotos = swap ? setSwapPhotos : setAttachments;
      setPhotos((prev) => [...prev, { url, type: "image" }]);
    } catch {
      setError("Nepodarilo sa nahrať obrázok.");
    } finally {
      setUploading(false);
      uploadingRef.current = false;
    }
  };

  return (
    <div className="border-t border-[#e9e2d1] bg-[#f8f4eb] p-3 pb-[calc(18px+env(safe-area-inset-bottom))]">
      {!dealConfirmed && canBuyerSendOffers && (
        <div className="mb-2 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 rounded-full border-[#d8d1bf] bg-[#faf8f4] text-[#232711] hover:bg-[#f1ece1]"
            onClick={() => {
              setError("");
              setPriceOfferOpen(true);
            }}
            disabled={pending || uploading}
          >
            <Euro className="size-3.5" />
            Ponuka ceny
          </Button>
          {canBuyerSendSwapOffers && <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 rounded-full border-[#d8d1bf] bg-[#faf8f4] text-[#232711] hover:bg-[#f1ece1]"
            onClick={() => {
              setError("");
              setSwapOfferOpen(true);
            }}
            disabled={pending || uploading}
          >
            <ArrowLeftRight className="size-3.5" />
            Ponuka výmeny
          </Button>}
        </div>
      )}

      {textChatLocked && (
        <p className="mb-2 text-xs text-muted-foreground">{textChatLockMessage}</p>
      )}

      {!textChatLocked && attachments.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {attachments.map((att, i) => (
            <div key={i} className="relative shrink-0">
              <Image
                width={64}
                height={64}
                src={att.url}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
              <button
                type="button"
                className="absolute -right-2 -top-2 flex size-11 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                disabled={pending}
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

      {!textChatLocked && (
        <div className="flex gap-2">
          {uploadImageUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#d8d1bf] bg-[#faf8f4] text-[#67635c] transition-colors hover:bg-[#f1ece1] hover:text-[#232711]"
              aria-label="Pridať obrázok"
              disabled={pending || uploading || attachments.length >= 10}
            >
              <ImagePlus className="size-5" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void handleSendText();
              }
            }}
            placeholder="Napíšte správu…"
            rows={1}
            className="rootie-field min-h-11 max-h-32 flex-1 resize-y overflow-y-auto rounded-[16px] py-2.5 leading-6"
            disabled={pending}
            maxLength={5000}
            aria-label="Správa"
          />

          <Button
            type="button"
            size="icon"
            className="size-11 shrink-0 rounded-full bg-[#4f5826] text-white hover:bg-[#424a20]"
            onClick={() => {
              void handleSendText();
            }}
            disabled={pending || uploading || (!body.trim() && attachments.length === 0)}
            aria-label="Odoslať"
          >
            <Send className="size-4" />
          </Button>
        </div>
      )}

      {uploading && <p className="mt-1 text-sm text-muted-foreground" role="status">Nahrávam obrázok…</p>}

      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}

      <Drawer open={priceOfferOpen} onOpenChange={setPriceOfferOpen} direction="bottom">
        <DrawerContent className="max-h-[90vh] rounded-t-[22px] border-[#e9e2d1] bg-[#faf8f4]">
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
              min={0.01}
              step={0.01}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0"
              className="rootie-field"
              disabled={pending}
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>

          <DrawerFooter>
            <Button
              type="button"
              onClick={() => {
                void handleSendOfferPrice();
              }}
              disabled={pending || uploading || dealConfirmed || !offerAmount.trim()}
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
        <DrawerContent className="max-h-[90vh] rounded-t-[22px] border-[#e9e2d1] bg-[#faf8f4]">
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
              className="rootie-textarea resize-none"
              disabled={pending}
              maxLength={5000}
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
                  disabled={pending || uploading || !uploadImageUrl || swapPhotos.length >= 10}
                >
                  <ImagePlus className="size-4" />
                  Pridať fotku
                </Button>
              </div>

              <input
                ref={swapPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={handleSwapPhotoChange}
              />

              {swapPhotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {swapPhotos.map((photo, i) => (
                    <div key={`${photo.url}-${i}`} className="relative shrink-0">
                      <Image
                        width={80}
                        height={80}
                        src={photo.url}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -right-2 -top-2 flex size-11 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                        disabled={pending}
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
            {uploading && <p role="status" className="text-sm text-muted-foreground">Nahrávam obrázok…</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>

          <DrawerFooter>
            <Button
              type="button"
              onClick={() => {
                void handleSendOfferSwap();
              }}
              disabled={pending || uploading || dealConfirmed || !offerSwapText.trim()}
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
