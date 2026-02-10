"use client";

import { useTransition } from "react";
import { Heart, Star, Zap, Smile, Frown } from "lucide-react";

import { saveReaction } from "@/lib/actions/reactions-saves";
import type { ReactionType, ReactionCounts } from "@/lib/data/listings";
import { cn } from "@/lib/utils";

const REACTIONS: { type: ReactionType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "like", label: "Páči sa", Icon: Heart },
  { type: "want", label: "Chcem", Icon: Star },
  { type: "wow", label: "Wow", Icon: Zap },
  { type: "funny", label: "Vtipné", Icon: Smile },
  { type: "sad", label: "Smutné", Icon: Frown },
];

type ListingReactionsProps = {
  listingId: string;
  reactionCounts: ReactionCounts;
  myReaction: ReactionType | null;
  isAuthenticated: boolean;
};

export function ListingReactions({
  listingId,
  reactionCounts,
  myReaction,
  isAuthenticated,
}: ListingReactionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleSelect = (type: ReactionType) => {
    if (!isAuthenticated) return;
    startTransition(() => {
      saveReaction(listingId, myReaction === type ? null : type);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map(({ type, label, Icon }) => {
        const count = reactionCounts[type] ?? 0;
        const isActive = myReaction === type;
        return (
          <button
            key={type}
            type="button"
            disabled={!isAuthenticated || isPending}
            onClick={() => handleSelect(type)}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-muted/50 text-muted-foreground hover:bg-muted",
              (!isAuthenticated || isPending) && "pointer-events-none opacity-70"
            )}
            aria-label={`${label}${count ? ` (${count})` : ""}${isActive ? ", vybrané" : ""}`}
            aria-pressed={isActive}
          >
            <Icon className="size-3.5" aria-hidden />
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
