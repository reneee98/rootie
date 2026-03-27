"use client";

import { useState } from "react";
import { Ellipsis } from "lucide-react";

import { ReportListingDialog } from "@/components/listing/report-listing-dialog";
import { cn } from "@/lib/utils";

type ListingReportButtonProps = {
  listingId: string;
  isOwnListing: boolean;
  isAuthenticated: boolean;
  className?: string;
};

export function ListingReportButton({
  listingId,
  isOwnListing,
  isAuthenticated,
  className,
}: ListingReportButtonProps) {
  const [open, setOpen] = useState(false);

  if (isOwnListing || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex size-[44px] items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]",
          className
        )}
        aria-label="Viac možností"
      >
        <Ellipsis className="size-5" aria-hidden />
      </button>

      <ReportListingDialog
        listingId={listingId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
