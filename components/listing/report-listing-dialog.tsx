"use client";

import { useActionState, useEffect } from "react";
import {
  reportListingFormAction,
  type ReportFormState,
} from "@/lib/actions/report";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Obtěžovanie",
  scam: "Podvod",
  inappropriate_content: "Nevhodný obsah",
  other: "Iné",
};

type ReportListingDialogProps = {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportListingDialog({
  listingId,
  open,
  onOpenChange,
}: ReportListingDialogProps) {
  const [reportState, reportFormAction] = useActionState<
    ReportFormState | null,
    FormData
  >((prev, formData) => reportListingFormAction(prev, formData), null);

  useEffect(() => {
    if (reportState?.ok === true) {
      onOpenChange(false);
    }
  }, [reportState, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {Object.entries(REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
            <p className="text-destructive text-sm">{reportState.error}</p>
          )}
          {reportState?.ok === true && (
            <p className="text-sm text-emerald-600">Nahlásenie odoslané.</p>
          )}
        </form>
        <DialogFooter showCloseButton>
          <Button type="submit" form="report-listing-form">
            Odoslať nahlásenie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
