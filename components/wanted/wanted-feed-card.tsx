import Link from "next/link";
import { ArrowLeftRight, Euro, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import type { WantedFeedCard as WantedFeedCardType } from "@/lib/data/wanted";
import { cn } from "@/lib/utils";

const INTENT_LABELS: Record<string, string> = {
  buy: "Kúpiť",
  swap: "Vymeniť",
  both: "Kúpiť / Vymeniť",
};

type WantedFeedCardProps = {
  item: WantedFeedCardType;
};

export function WantedFeedCard({ item }: WantedFeedCardProps) {
  const displayName = item.user.display_name?.trim() || "Používateľ";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const budgetLabel =
    item.budget_min != null && item.budget_max != null
      ? `${formatPrice(item.budget_min)} – ${formatPrice(item.budget_max)}`
      : item.budget_min != null
        ? `Od ${formatPrice(item.budget_min)}`
        : item.budget_max != null
          ? `Do ${formatPrice(item.budget_max)}`
          : "Dohodou";

  return (
    <Link
      href={`/wanted/${item.id}`}
      className={cn(
        "focus-visible:ring-ring flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
      aria-label={`${item.plant_name}, ${INTENT_LABELS[item.intent] ?? item.intent}`}
    >
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-medium leading-tight">
            {item.plant_name}
          </span>
          <Badge variant="secondary" className="shrink-0 gap-0.5 text-[10px]">
            {item.intent === "swap" && (
              <ArrowLeftRight className="size-2.5" aria-hidden />
            )}
            {INTENT_LABELS[item.intent] ?? item.intent}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Euro className="size-3 shrink-0" aria-hidden />
          <span>{budgetLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            {item.district ? `${item.district}, ` : ""}
            {item.region}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 border-t pt-2">
          <Avatar size="sm">
            {item.user.avatar_url ? (
              <AvatarImage src={item.user.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">
            {displayName}
          </span>
        </div>
      </div>
    </Link>
  );
}
