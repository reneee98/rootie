"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Handshake, Star, PackageCheck } from "lucide-react";

import { confirmDeal, confirmOrderDelivered } from "@/lib/actions/reviews";
import { Button } from "@/components/ui/button";
import type { ThreadDetail } from "@/lib/data/chat";
import type { ThreadDealState } from "@/lib/data/reviews";
import type { ReviewEligibility } from "@/lib/data/reviews";

type ChatDealAndReviewProps = {
  thread: ThreadDetail;
  currentUserId: string;
  dealState?: ThreadDealState | null;
  reviewEligibility?: ReviewEligibility | null;
  listingSellerId?: string | null;
  hasBuyerReviewed?: boolean | null;
};

export function ChatDealAndReview({
  thread,
  currentUserId,
  dealState,
  reviewEligibility,
  listingSellerId,
  hasBuyerReviewed = null,
}: ChatDealAndReviewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isListingContext =
    thread.context_type === "listing" && thread.listing_id;
  const isSeller = Boolean(
    listingSellerId && listingSellerId === currentUserId
  );

  const dealConfirmed = dealState?.dealConfirmedAt != null;
  const orderDelivered = dealState?.orderDeliveredAt != null;
  const iConfirmed = dealState?.iConfirmed ?? false;

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

  const handleConfirmOrderDelivered = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmOrderDelivered(thread.id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (!dealState && !reviewEligibility && hasBuyerReviewed === null) return null;

  return (
    <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
      {dealState && (
        <div className="flex flex-wrap items-center gap-2">
          {!dealConfirmed ? (
            isListingContext ? (
              isSeller ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending || iConfirmed}
                    onClick={handleConfirmDeal}
                    className="gap-1.5"
                    aria-label={
                      iConfirmed ? "Už ste potvrdili" : "Potvrdiť dohodu"
                    }
                  >
                    <Handshake className="size-4" aria-hidden />
                    {iConfirmed ? "Potvrdené" : "Potvrdiť dohodu"}
                  </Button>
                  {error && (
                    <p className="text-destructive text-xs w-full">{error}</p>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Čaká sa na potvrdenie predajcom
                </span>
              )
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending || iConfirmed}
                  onClick={handleConfirmDeal}
                  className="gap-1.5"
                  aria-label={
                    iConfirmed ? "Už ste potvrdili" : "Potvrdiť dohodu"
                  }
                >
                  <Handshake className="size-4" aria-hidden />
                  {iConfirmed ? "Potvrdené" : "Potvrdiť dohodu"}
                </Button>
                {iConfirmed && !dealState?.otherConfirmed && (
                  <span className="text-muted-foreground text-xs">
                    Čaká sa na potvrdenie druhou stranou
                  </span>
                )}
                {error && (
                  <p className="text-destructive text-xs w-full">{error}</p>
                )}
              </>
            )
          ) : (
            <>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                <Handshake className="size-4 text-emerald-600" aria-hidden />
                Dohoda potvrdená
              </span>

              {isListingContext && (
                <>
                  {isSeller ? (
                    <>
                      {!orderDelivered ? (
                        <span className="text-muted-foreground text-sm">
                          Čaká sa na potvrdenie doručenia kupujúcim.
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Objednávka bola doručená.{" "}
                          {hasBuyerReviewed
                            ? "Kupujúci zanechal recenziu."
                            : "Kupujúci nezanechal recenziu."}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {!orderDelivered ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={handleConfirmOrderDelivered}
                          className="gap-1.5"
                          aria-label="Objednávka doručená"
                        >
                          <PackageCheck className="size-4" aria-hidden />
                          Objednávka doručená
                        </Button>
                      ) : reviewEligibility?.eligible ? (
                        <Button asChild variant="secondary" size="sm" className="gap-1.5">
                          <Link
                            href={`/review/new?threadId=${thread.id}&listingId=${thread.listing_id}&sellerId=${listingSellerId}`}
                            aria-label="Napísať recenziu"
                          >
                            <Star className="size-4" aria-hidden />
                            Napísať recenziu
                          </Link>
                        </Button>
                      ) : reviewEligibility?.reason ? (
                        <p className="text-muted-foreground text-xs">
                          {reviewEligibility.reason}
                        </p>
                      ) : null}
                      {error && (
                        <p className="text-destructive text-xs w-full">{error}</p>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {isListingContext &&
        thread.listing_id &&
        listingSellerId &&
        reviewEligibility &&
        !dealConfirmed &&
        (reviewEligibility.eligible ? (
          <div>
            <Button asChild variant="secondary" size="sm" className="gap-1.5">
              <Link
                href={`/review/new?threadId=${thread.id}&listingId=${thread.listing_id}&sellerId=${listingSellerId}`}
                aria-label="Napísať recenziu"
              >
                <Star className="size-4" aria-hidden />
                Napísať recenziu
              </Link>
            </Button>
          </div>
        ) : reviewEligibility.reason ? (
          <p className="text-muted-foreground text-xs">
            {reviewEligibility.reason}
          </p>
        ) : null)}
    </div>
  );
}
