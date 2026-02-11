import Link from "next/link";
import { ArrowLeftRight, Flower2, MapPin } from "lucide-react";
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
  const locationLabel = item.district ? `${item.district}, ${item.region}` : item.region;

  return (
    <Link
      href={`/wanted/${item.id}`}
      className={cn(
        "focus-visible:ring-ring flex flex-col overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm",
        "outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
      aria-label={`${item.plant_name}, ${INTENT_LABELS[item.intent] ?? item.intent}`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted to-secondary/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-primary/20 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
            <Flower2 className="size-8 text-primary/70" aria-hidden />
          </div>
        </div>
        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
          <Badge className="rounded-full px-2 py-1 text-[10px] tracking-wide uppercase">
            HĽADÁM
          </Badge>
          <Badge
            variant="secondary"
            className="shrink-0 gap-1 rounded-full px-2 py-1 text-[10px] uppercase"
          >
            {item.intent === "swap" && (
              <ArrowLeftRight className="size-3" aria-hidden />
            )}
            {INTENT_LABELS[item.intent] ?? item.intent}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-snug">
          {item.plant_name}
        </p>
        <p className="text-sm font-semibold">{budgetLabel}</p>
        <p className="text-muted-foreground text-[11px]">{locationLabel}</p>

        <div className="border-border/70 flex items-center gap-2 border-t pt-2">
          <Avatar className="size-7 shrink-0">
            {item.user.avatar_url ? (
              <AvatarImage src={item.user.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-[10px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium">{displayName}</p>
            <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{locationLabel}</span>
            </p>
          </div>

        </div>
      </div>
    </Link>
  );
}
