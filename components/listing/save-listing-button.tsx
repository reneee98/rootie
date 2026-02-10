"use client";

import { useTransition } from "react";
import { Bookmark } from "lucide-react";

import { toggleSave } from "@/lib/actions/reactions-saves";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveListingButtonProps = {
  listingId: string;
  isSaved: boolean;
  isAuthenticated: boolean;
  variant?: "icon" | "label";
  className?: string;
};

export function SaveListingButton({
  listingId,
  isSaved,
  isAuthenticated,
  variant = "icon",
  className,
}: SaveListingButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!isAuthenticated) return;
    startTransition(() => {
      toggleSave(listingId);
    });
  };

  if (!isAuthenticated && variant === "icon") {
    return null;
  }

  const label = isSaved ? "Uložené" : "Uložiť";

  return (
    <Button
      type="button"
      variant={variant === "icon" ? "outline" : "secondary"}
      size={variant === "icon" ? "icon" : "sm"}
      disabled={!isAuthenticated || isPending}
      onClick={handleClick}
      className={cn(className)}
      aria-label={label}
      aria-pressed={isSaved}
      title={!isAuthenticated ? "Prihláste sa" : label}
    >
      <Bookmark
        className={cn("size-4", isSaved && "fill-current")}
        aria-hidden
      />
      {variant === "label" && (
        <span className="ml-1.5">{isSaved ? "Uložené" : "Uložiť"}</span>
      )}
    </Button>
  );
}
