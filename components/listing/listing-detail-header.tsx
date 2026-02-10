"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";

import { SaveListingButton } from "@/components/listing/save-listing-button";
import { cn } from "@/lib/utils";

type ListingDetailHeaderProps = {
  listingId: string;
  isSaved: boolean;
  isAuthenticated: boolean;
  title: string;
  className?: string;
};

export function ListingDetailHeader({
  listingId,
  isSaved,
  isAuthenticated,
  title,
  className,
}: ListingDetailHeaderProps) {
  const router = useRouter();

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator
        .share({
          title: title || "Rootie inzerát",
          url,
        })
        .catch(() => {
          copyToClipboard(url);
        });
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <header
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-2 backdrop-blur",
        className
      )}
    >
      <div className="flex min-h-11 min-w-11 items-center">
        <button
          type="button"
          onClick={() => router.back()}
          className="focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
          aria-label="Späť"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleShare}
          className="focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
          aria-label="Zdieľať"
        >
          <Share2 className="size-5" aria-hidden />
        </button>
        <SaveListingButton
          listingId={listingId}
          isSaved={isSaved}
          isAuthenticated={isAuthenticated}
          variant="icon"
          className="size-11 shrink-0"
        />
      </div>
    </header>
  );
}
