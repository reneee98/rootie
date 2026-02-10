"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import { Flag, MessageCircle } from "lucide-react";

import {
  reportListingFormAction,
  type ReportFormState,
} from "@/lib/actions/report";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ListingActionsProps = {
  listingId: string;
  sellerId: string;
  isOwnListing: boolean;
  isAuthenticated: boolean;
  /** When true, hide "Reagovať na ponuku" in sticky bar (auction: user reacts by bidding only). */
  isAuction?: boolean;
};

export function ListingActions({
  listingId,
  sellerId,
  isOwnListing,
  isAuthenticated,
  isAuction = false,
}: ListingActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportState, reportFormAction] = useActionState<
    ReportFormState | null,
    FormData
  >((prev, formData) => reportListingFormAction(prev, formData), null);

  useEffect(() => {
    if (reportState?.ok === true) {
      setReportOpen(false);
    }
  }, [reportState]);

  const reasons = ["spam", "harassment", "scam", "inappropriate_content", "other"] as const;

  return (
    <>
      {/* Sticky CTA — above bottom nav (nav ≈ 3.5rem + safe area) */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed right-0 left-0 z-40 border-t backdrop-blur py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bottom-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          {isOwnListing ? (
            <Button asChild className="flex-1" size="lg">
              <Link href={`/listing/${listingId}/edit`}>Upraviť inzerát</Link>
            </Button>
          ) : isAuction ? (
            <p className="text-muted-foreground flex-1 py-2 text-center text-sm">
              Prihodite v sekcii Aukcia vyššie.
            </p>
          ) : isAuthenticated ? (
            <Button asChild className="flex-1" size="lg">
              <Link href={`/listing/${listingId}/offer`}>
                <MessageCircle className="size-4" aria-hidden />
                Reagovať na ponuku
              </Link>
            </Button>
          ) : (
            <Button asChild className="flex-1" size="lg">
              <Link
                href={`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`}
              >
                <MessageCircle className="size-4" aria-hidden />
                Reagovať na ponuku
              </Link>
            </Button>
          )}

          {!isOwnListing && (
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!isAuthenticated}
                  title={!isAuthenticated ? "Prihláste sa" : "Nahlásiť inzerát"}
                  aria-label="Nahlásiť inzerát"
                >
                  <Flag className="size-4" aria-hidden />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nahlásiť inzerát</DialogTitle>
                  <DialogDescription>
                    Popíšte dôvod nahlásenia.
                  </DialogDescription>
                </DialogHeader>
                <form
                  action={reportFormAction}
                  className="flex flex-col gap-4"
                  id="report-listing-form"
                >
                  <input type="hidden" name="listingId" value={listingId} />
                  <label
                    className="text-sm font-medium"
                    htmlFor="report-listing-reason"
                  >
                    Dôvod
                  </label>
                  <select
                    id="report-listing-reason"
                    name="reason"
                    className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                    required
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r === "spam" && "Spam"}
                        {r === "harassment" && "Obtěžovanie"}
                        {r === "scam" && "Podvod"}
                        {r === "inappropriate_content" && "Nevhodný obsah"}
                        {r === "other" && "Iné"}
                      </option>
                    ))}
                  </select>
                  <label
                    className="text-sm font-medium"
                    htmlFor="report-listing-details"
                  >
                    Detail (voliteľné)
                  </label>
                  <textarea
                    id="report-listing-details"
                    name="details"
                    placeholder="Popis problému…"
                    rows={3}
                    className="border-input focus-visible:ring-ring w-full resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] md:text-sm"
                  />
                  {reportState?.ok === false && (
                    <p className="text-destructive text-sm">
                      {reportState.error}
                    </p>
                  )}
                  {reportState?.ok === true && (
                    <p className="text-sm text-emerald-600">
                      Nahlásenie odoslané.
                    </p>
                  )}
                </form>
                <DialogFooter showCloseButton>
                  <Button type="submit" form="report-listing-form">
                    Odoslať nahlásenie
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </>
  );
}
