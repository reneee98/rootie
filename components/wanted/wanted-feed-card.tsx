import Link from "next/link";
import { ArrowLeftRight, Flower2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import type { WantedFeedCard as WantedFeedCardType } from "@/lib/data/wanted";

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
  const firstName = displayName.split(/\s+/)[0] || "Používateľ";
  const intentLabel = INTENT_LABELS[item.intent] ?? item.intent;

  return (
    <article className="relative overflow-hidden rounded-[14px] bg-[#faf8f4] shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
      <Link
        href={`/wanted/${item.id}`}
        className="absolute inset-0 z-10"
        aria-label={`${item.plant_name}, ${intentLabel}`}
      />

      <div className="relative h-[167.75px] overflow-hidden p-[10px]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0ebdc] via-[#f6f2e8] to-[#ebe4d4]" />
        <div className="absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-t from-[#e3dccd] to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-[#c4c35b]/30 bg-[#faf8f4]/90 p-4 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
            <Flower2 className="size-8 text-[#5a6e5a]" aria-hidden />
          </div>
        </div>

        <div className="relative z-20 flex min-w-0 items-center gap-[6px]">
          <Badge className="rounded-[8px] bg-[#4f5826] px-[6px] py-[4px] text-[10px] leading-[14px] tracking-normal text-[#c4c35b]">
            HĽADÁM
          </Badge>
          <Badge
            variant="secondary"
            className="min-w-0 max-w-[calc(100%-62px)] gap-1 rounded-[8px] bg-[#f1ece1] px-[6px] py-[4px] text-[10px] leading-[14px] tracking-normal text-[#4f5826]"
          >
            {item.intent !== "buy" ? (
              <ArrowLeftRight className="size-3" aria-hidden />
            ) : null}
            <span className="truncate">{intentLabel}</span>
          </Badge>
        </div>
      </div>

      <div className="space-y-1.5 p-[10px] text-[#232711]">
        <div>
          <div className="flex h-[14px] items-center gap-[3.5px]">
            <MapPin className="size-[10.5px] text-[#5a6e5a]" aria-hidden />
            <span className="truncate text-[10px] leading-[14px] text-[#5a6e5a]">{locationLabel}</span>
          </div>
          <p className="w-full truncate text-[12px] font-medium leading-[18px]">{item.plant_name}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold leading-[18px]">{budgetLabel}</p>
          <span className="shrink-0 rounded-[8px] bg-[#f1ece1] px-2 py-1 text-[9px] font-semibold leading-none text-[#4f5826]">
            {item.intent === "swap" || item.intent === "both" ? (
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight className="size-[10px]" aria-hidden />
                {item.intent === "both" ? "Oboje" : "Výmena"}
              </span>
            ) : (
              "Kúpa"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-[8px] bg-[#f6f3ed] px-[7px] py-[5px]">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-[22px] shrink-0 border border-[#e9e2d1]">
              {item.user.avatar_url ? (
                <AvatarImage src={item.user.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-[#f1ece1] text-[9px] font-semibold text-[#4f5826]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[10px] leading-[14px] text-[#5a6e5a]">{firstName}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
