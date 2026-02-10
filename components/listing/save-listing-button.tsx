"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";

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
  const [saved, setSaved] = useState(isSaved);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleClick = () => {
    if (!isAuthenticated || isPending) return;
    startTransition(() => {
      toggleSave(listingId)
        .then((result) => {
          if (!result.ok) return;
          setSaved(result.is_saved);
          setToastMessage(result.is_saved ? "Uložené ✅" : "Odložené z uložených");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("rootie:saved-changed"));
          }
        })
        .catch(() => {
          // No-op: fallback to server data on next refresh.
        });
    });
  };

  if (!isAuthenticated && variant === "icon") {
    return null;
  }

  const label = saved ? "Uložené" : "Uložiť";

  return (
    <>
      <Button
        type="button"
        variant={variant === "icon" ? "outline" : "secondary"}
        size={variant === "icon" ? "icon" : "sm"}
        disabled={!isAuthenticated || isPending}
        onClick={handleClick}
        className={cn(className)}
        aria-label={label}
        aria-pressed={saved}
        title={!isAuthenticated ? "Prihláste sa" : label}
      >
        <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
        {variant === "label" ? <span className="ml-1.5">{label}</span> : null}
      </Button>

      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4">
          <div className="border-primary/20 bg-background/95 text-foreground rounded-full border px-3 py-1.5 text-xs font-medium shadow backdrop-blur">
            {toastMessage}
          </div>
        </div>
      ) : null}
    </>
  );
}
