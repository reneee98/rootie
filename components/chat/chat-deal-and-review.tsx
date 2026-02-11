"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Handshake, PackageCheck, PackagePlus, Star } from "lucide-react";

import { confirmDeal } from "@/lib/actions/reviews";
import {
  markOrderDelivered,
  markOrderShipped,
  sendOrderShippingAddress,
} from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ThreadDetail } from "@/lib/data/chat";
import type { ThreadDealState, ReviewEligibility } from "@/lib/data/reviews";
import type { ThreadOrder, ProfileShippingAddress } from "@/lib/data/orders";

type ChatDealAndReviewProps = {
  thread: ThreadDetail;
  currentUserId: string;
  dealState?: ThreadDealState | null;
  orderState?: ThreadOrder | null;
  buyerDefaultShippingAddress?: ProfileShippingAddress | null;
  reviewEligibility?: ReviewEligibility | null;
  listingSellerId?: string | null;
  hasBuyerReviewed?: boolean | null;
};

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ChatDealAndReview({
  thread,
  currentUserId,
  dealState,
  orderState,
  buyerDefaultShippingAddress,
  reviewEligibility,
  listingSellerId,
  hasBuyerReviewed = null,
}: ChatDealAndReviewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressName, setAddressName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("Slovensko");
  const [addressPhone, setAddressPhone] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  const isListingContext =
    thread.context_type === "listing" && thread.listing_id;
  const isSeller = Boolean(listingSellerId && listingSellerId === currentUserId);

  const openAddressDialog = () => {
    const prefill =
      orderState?.shipping_address ?? buyerDefaultShippingAddress ?? null;

    setAddressName(prefill?.name ?? "");
    setAddressStreet(prefill?.street ?? "");
    setAddressCity(prefill?.city ?? "");
    setAddressZip(prefill?.zip ?? "");
    setAddressCountry(prefill?.country ?? "Slovensko");
    setAddressPhone(prefill?.phone ?? "");
    setSaveAsDefault(true);
    setAddressDialogOpen(true);
  };

  const handleSendAddress = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendOrderShippingAddress(thread.id, {
        name: addressName,
        street: addressStreet,
        city: addressCity,
        zip: addressZip,
        country: addressCountry,
        phone: addressPhone || null,
        saveAsDefault,
      });

      if (result.ok) {
        setAddressDialogOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const handleMarkShipped = () => {
    setError(null);
    startTransition(async () => {
      const result = await markOrderShipped(thread.id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const handleMarkDelivered = () => {
    setError(null);
    startTransition(async () => {
      const result = await markOrderDelivered(thread.id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const handleConfirmDeal = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmDeal(thread.id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (!dealState && !orderState && !reviewEligibility && hasBuyerReviewed === null) {
    return null;
  }

  if (isListingContext) {
    if (!orderState) return null;

    const acceptedPriceLabel =
      orderState.accepted_price_eur != null && orderState.accepted_price_eur > 0.01
        ? formatPrice(orderState.accepted_price_eur)
        : null;

    return (
      <>
        <div className="space-y-2 border-t-2 border-emerald-300 bg-emerald-50/70 px-3 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <PackageCheck className="size-4 text-emerald-600" aria-hidden />
              Stav objednávky
            </span>
            {acceptedPriceLabel ? (
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                {acceptedPriceLabel}
              </span>
            ) : null}
          </div>

          {!isSeller && orderState.status === "price_accepted" && (
            <div className="space-y-2 rounded-lg border border-emerald-300 bg-background px-3 py-2">
              <p className="text-sm font-medium">
                Objednávka bude odoslaná. Pošlite predávajúcemu adresu, aby vám mohol zaslať balík.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={openAddressDialog}
                disabled={pending}
                className="gap-1.5"
              >
                <PackagePlus className="size-4" aria-hidden />
                Poslať adresu
              </Button>
            </div>
          )}

          {isSeller && orderState.status === "price_accepted" && (
            <p className="text-sm text-muted-foreground">
              Čaká sa na adresu od kupujúceho.
            </p>
          )}

          {!isSeller && orderState.status === "address_provided" && (
            <p className="text-sm text-muted-foreground">
              Adresa odoslaná. Čaká sa na označenie odoslania balíčka predajcom.
            </p>
          )}

          {isSeller && orderState.status === "address_provided" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMarkShipped}
              disabled={pending}
              className="gap-1.5"
            >
              <PackageCheck className="size-4" aria-hidden />
              Odoslané
            </Button>
          )}

          {!isSeller && orderState.status === "shipped" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMarkDelivered}
              disabled={pending}
              className="gap-1.5"
            >
              <PackageCheck className="size-4" aria-hidden />
              Doručené
            </Button>
          )}

          {isSeller && orderState.status === "shipped" && (
            <p className="text-sm text-muted-foreground">
              Balíček je označený ako odoslaný. Čaká sa na potvrdenie doručenia kupujúcim.
            </p>
          )}

          {orderState.status === "delivered" && (
            <div className="space-y-2">
              {!isSeller ? (
                reviewEligibility?.eligible ? (
                  <Button asChild variant="secondary" size="sm" className="gap-1.5">
                    <Link
                      href={`/review/new?threadId=${thread.id}&listingId=${thread.listing_id}&sellerId=${listingSellerId}`}
                      aria-label="Zanechať recenziu"
                    >
                      <Star className="size-4" aria-hidden />
                      Zanechať recenziu
                    </Link>
                  </Button>
                ) : reviewEligibility?.reason ? (
                  <p className="text-xs text-muted-foreground">{reviewEligibility.reason}</p>
                ) : null
              ) : (
                <p className="text-sm text-muted-foreground">
                  Objednávka bola doručená. {hasBuyerReviewed ? "Kupujúci zanechal recenziu." : "Kupujúci zatiaľ recenziu nezanechal."}
                </p>
              )}
            </div>
          )}

          {error && <p className="w-full text-xs text-destructive">{error}</p>}
        </div>

        <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Poslať adresu</DialogTitle>
              <DialogDescription>
                Adresa sa odošle len do tejto konverzácie po potvrdení.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="space-y-1">
                <label htmlFor="order-address-name" className="text-sm font-medium">
                  Meno a priezvisko
                </label>
                <Input
                  id="order-address-name"
                  value={addressName}
                  onChange={(e) => setAddressName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="order-address-street" className="text-sm font-medium">
                  Ulica a číslo
                </label>
                <Input
                  id="order-address-street"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="order-address-city" className="text-sm font-medium">
                    Mesto
                  </label>
                  <Input
                    id="order-address-city"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="order-address-zip" className="text-sm font-medium">
                    PSČ
                  </label>
                  <Input
                    id="order-address-zip"
                    value={addressZip}
                    onChange={(e) => setAddressZip(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="order-address-country" className="text-sm font-medium">
                    Krajina
                  </label>
                  <Input
                    id="order-address-country"
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="order-address-phone" className="text-sm font-medium">
                    Telefón (voliteľné)
                  </label>
                  <Input
                    id="order-address-phone"
                    value={addressPhone}
                    onChange={(e) => setAddressPhone(e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="mt-1 size-4 rounded border border-input accent-primary"
                />
                Uložiť ako predvolenú adresu pre ďalšie objednávky
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddressDialogOpen(false)}
                disabled={pending}
              >
                Zrušiť
              </Button>
              <Button
                type="button"
                onClick={handleSendAddress}
                disabled={
                  pending ||
                  !addressName.trim() ||
                  !addressStreet.trim() ||
                  !addressCity.trim() ||
                  !addressZip.trim() ||
                  !addressCountry.trim()
                }
              >
                Potvrdiť a odoslať adresu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (!dealState) return null;

  const dealConfirmed = dealState.dealConfirmedAt != null;
  const iConfirmed = dealState.iConfirmed ?? false;

  return (
    <div className="space-y-2 border-t bg-muted/20 px-3 py-2">
      {!dealConfirmed ? (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || iConfirmed}
            onClick={handleConfirmDeal}
            className="gap-1.5"
            aria-label={iConfirmed ? "Už ste potvrdili" : "Potvrdiť dohodu"}
          >
            <Handshake className="size-4" aria-hidden />
            {iConfirmed ? "Potvrdené" : "Potvrdiť dohodu"}
          </Button>
          {iConfirmed && !dealState.otherConfirmed && (
            <span className="text-xs text-muted-foreground">
              Čaká sa na potvrdenie druhou stranou.
            </span>
          )}
        </>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Handshake className="size-4 text-emerald-600" aria-hidden />
          Dohoda potvrdená
        </span>
      )}

      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}
