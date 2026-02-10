"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { saveReaction } from "@/lib/actions/reactions-saves";
import type { ReactionType, ReactionCounts } from "@/lib/data/listings";
import { cn } from "@/lib/utils";

const REACTIONS: {
  type: ReactionType;
  emoji: string;
  label: string;
}[] = [
  { type: "like", emoji: "👍", label: "Páči sa" },
  { type: "want", emoji: "😍", label: "Chcem" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "funny", emoji: "😂", label: "Vtipné" },
  { type: "sad", emoji: "😢", label: "Smutné" },
];

type ListingReactionsBarProps = {
  listingId: string;
  reactionCounts: ReactionCounts;
  myReaction: ReactionType | null;
  isAuthenticated: boolean;
};

export function ListingReactionsBar({
  listingId,
  reactionCounts,
  myReaction,
  isAuthenticated,
}: ListingReactionsBarProps) {
  const [open, setOpen] = useState(false);
  const [optimisticReaction, setOptimisticReaction] = useState<ReactionType | null>(myReaction);
  const [optimisticCounts, setOptimisticCounts] = useState<ReactionCounts>(reactionCounts);
  const [isPending, setIsPending] = useState(false);

  const displayReaction = optimisticReaction ?? myReaction;
  const displayCounts = optimisticCounts;

  const totalCount = Object.values(displayCounts).reduce((a, b) => a + b, 0);

  const handleSelect = async (type: ReactionType) => {
    if (!isAuthenticated) return;
    const previous = displayReaction;
    const previousCount = previous ? displayCounts[previous] ?? 0 : 0;
    const newCount = displayCounts[type] ?? 0;
    const isTogglingOff = previous === type;

    setOptimisticReaction(isTogglingOff ? null : type);
    setOptimisticCounts((prev) => {
      const next = { ...prev };
      if (previous) next[previous] = Math.max(0, (next[previous] ?? 0) - 1);
      if (!isTogglingOff) next[type] = (next[type] ?? 0) + 1;
      return next;
    });
    setIsPending(true);
    await saveReaction(listingId, isTogglingOff ? null : type);
    setIsPending(false);
    setOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {REACTIONS.map(({ type, emoji }) => {
          const count = reactionCounts[type] ?? 0;
          if (count === 0) return null;
          return (
            <span
              key={type}
              className="text-muted-foreground inline-flex items-center gap-1 rounded-full border border-input bg-muted/30 px-3 py-2 text-sm"
            >
              <span aria-hidden>{emoji}</span>
              <span>{count}</span>
            </span>
          );
        })}
        {totalCount === 0 && (
          <span className="text-muted-foreground text-sm">Žiadne reakcie</span>
        )}
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border border-input bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50",
            totalCount > 0 && "min-h-11"
          )}
          aria-label="Pridať alebo zmeniť reakciu"
          aria-expanded={open}
        >
          {REACTIONS.map(({ type, emoji }) => {
            const count = displayCounts[type] ?? 0;
            if (count === 0 && displayReaction !== type) return null;
            return (
              <span
                key={type}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm",
                  displayReaction === type
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <span aria-hidden>{emoji}</span>
                {count > 0 && <span>{count}</span>}
              </span>
            );
          })}
          {totalCount === 0 && (
            <span className="text-muted-foreground text-sm">
              Kliknite a pridajte reakciu
            </span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="rounded-t-2xl">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
        <DrawerHeader className="pb-2 text-center">
          <DrawerTitle>Reakcia</DrawerTitle>
        </DrawerHeader>
        <div className="grid grid-cols-5 gap-2 px-4 pb-8">
          {REACTIONS.map(({ type, emoji, label }) => (
            <button
              key={type}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(type)}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border transition-colors",
                displayReaction === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-muted/50"
              )}
              aria-label={label}
              aria-pressed={displayReaction === type}
            >
              <span className="text-2xl" aria-hidden>
                {emoji}
              </span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
