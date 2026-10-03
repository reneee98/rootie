import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Euro,
  Ellipsis,
  MapPin,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListingBackButton } from "@/components/listing/listing-back-button";
import { getWantedDetail } from "@/lib/data/wanted";
import { formatPrice } from "@/lib/formatters";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getRegionShortLabel } from "@/lib/regions";

const INTENT_LABELS: Record<string, string> = {
  buy: "Kúpiť",
  swap: "Vymeniť",
  both: "Kúpiť aj vymeniť",
};

type WantedDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WantedDetailPage({
  params,
}: WantedDetailPageProps) {
  const { id } = await params;
  const [wanted, currentUser] = await Promise.all([
    getWantedDetail(id),
    getUser(),
  ]);

  if (!wanted || wanted.status !== "active") {
    notFound();
  }

  const isOwnWanted = currentUser?.id === wanted.user_id;
  const isAuthenticated = !!currentUser;

  const budgetLabel =
    wanted.budget_min != null && wanted.budget_max != null
      ? `${formatPrice(wanted.budget_min)} – ${formatPrice(wanted.budget_max)}`
      : wanted.budget_min != null
        ? `Od ${formatPrice(wanted.budget_min)}`
        : wanted.budget_max != null
          ? `Do ${formatPrice(wanted.budget_max)}`
          : "Dohodou";
  const locationLabel = wanted.district
    ? `${getRegionShortLabel(wanted.region)}, ${wanted.district}`
    : getRegionShortLabel(wanted.region);
  const createdLabel = new Date(wanted.created_at).toLocaleDateString("sk-SK", {
    timeZone: "Europe/Bratislava",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const intentLabel = INTENT_LABELS[wanted.intent] ?? wanted.intent;

  const displayName = wanted.user.display_name?.trim() || "Používateľ";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div className="min-h-dvh bg-[#faf8f4] pb-32">
      <main className="mx-auto max-w-md">
        <div className="flex items-center justify-between px-3 pt-3">
          <ListingBackButton className="text-[#4f5826] drop-shadow-none" />
          <Link
            href={`/profile/${wanted.user.id}`}
            className="flex size-[44px] items-center justify-center text-[#4f5826]"
            aria-label={`Profil používateľa ${displayName}`}
          >
            <Ellipsis className="size-5" aria-hidden />
          </Link>
        </div>

        <div className="flex flex-col gap-[3px] pt-1">
          <section className="mx-3 border-b border-[rgba(0,0,0,0.06)] px-[14px] pb-[12px] pt-[12px]">
            <p className="flex items-center gap-[5px] text-[12.25px] leading-[17.5px] text-[#5a6e5a]">
              <MapPin className="size-[14px]" aria-hidden />
              {locationLabel}
            </p>
            <h1 className="mt-1.5 text-[17px] font-medium leading-[23px] text-[#1a2e1a]">
              {wanted.plant_name}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-[22px] font-semibold leading-[24px] text-[#232711]">
              <Euro className="size-[18px]" aria-hidden />
              {budgetLabel}
            </p>
            <p className="mt-1 flex items-center gap-[5px] text-[12px] leading-[16px] text-[#5a6e5a]">
              <ArrowLeftRight className="size-[13px]" aria-hidden />
              {intentLabel}
            </p>
          </section>

          <section className="mx-3 border-b border-[rgba(0,0,0,0.06)] px-[14px] pb-[12px] pt-[12px]">
            <h2 className="text-[13px] font-semibold leading-[18px] text-[#232711]">Informácie</h2>
            <div className="mt-2.5 grid grid-cols-2 gap-x-2.5 gap-y-2.5">
              <div className="flex gap-[8.75px]">
                <ArrowLeftRight className="mt-[1px] size-[14px] text-[#5a6e5a]" aria-hidden />
                <div>
                  <p className="text-[11.5px] leading-[15px] text-[#5a6e5a]">Typ</p>
                  <p className="text-[13px] font-semibold leading-[16px] text-[#1a2e1a]">{intentLabel}</p>
                </div>
              </div>
              <div className="flex gap-[8.75px]">
                <Euro className="mt-[1px] size-[14px] text-[#5a6e5a]" aria-hidden />
                <div>
                  <p className="text-[11.5px] leading-[15px] text-[#5a6e5a]">Rozpočet</p>
                  <p className="text-[13px] font-semibold leading-[16px] text-[#1a2e1a]">{budgetLabel}</p>
                </div>
              </div>
              <div className="col-span-2 flex gap-[8.75px]">
                <Calendar className="mt-[1px] size-[14px] text-[#5a6e5a]" aria-hidden />
                <div>
                  <p className="text-[11.5px] leading-[15px] text-[#5a6e5a]">Pridané</p>
                  <p className="text-[13px] font-semibold leading-[16px] text-[#1a2e1a]">{createdLabel}</p>
                </div>
              </div>
            </div>
          </section>

          {wanted.notes?.trim() ? (
            <section className="mx-3 border-b border-[rgba(0,0,0,0.06)] px-[14px] pb-[12px] pt-[12px]">
              <h2 className="text-[13px] font-semibold leading-[18px] text-[#232711]">Poznámka</h2>
              <p className="mt-2 text-[13px] leading-[18px] whitespace-pre-wrap text-[#5a6e5a]">
                {wanted.notes.trim()}
              </p>
            </section>
          ) : null}

          <section aria-label="Používateľ" className="mx-3 px-[14px] pb-[12px] pt-[12px]">
            <h2 className="text-[13px] font-semibold leading-[18px] text-[#1a2e1a]">Používateľ</h2>
            <div className="mt-2.5 flex h-[72px] items-center gap-2.5 rounded-[14px] bg-[#f1ece1] px-3">
              <Avatar className="size-11 shrink-0 bg-[#e5decc]">
                {wanted.user.avatar_url ? (
                  <AvatarImage src={wanted.user.avatar_url} alt={displayName} />
                ) : null}
                <AvatarFallback className="text-[13px] font-medium text-[#8f9036]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold leading-[18px] text-[#1a2e1a]">
                  {displayName}
                </p>
                <p className="mt-1 truncate text-[10px] leading-[12px] text-[#5a6e5a]">
                  {wanted.user.region || locationLabel}
                </p>
              </div>
              <Link
                href={`/profile/${wanted.user.id}`}
                className="inline-flex items-center gap-[2px] text-[12px] font-medium leading-[16px] text-[#4f5826]"
                aria-label={`Profil používateľa ${displayName}`}
              >
                Profil
                <ArrowRight className="size-[14px]" aria-hidden />
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky CTA: fixed at bottom, without bottom nav */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed right-0 left-0 bottom-0 z-40 border-t backdrop-blur py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4">
          {isOwnWanted ? (
            <p className="text-muted-foreground flex-1 py-2 text-center text-sm">
              Toto je vaša požiadavka. Ponuky prídu do konverzácií.
            </p>
          ) : isAuthenticated ? (
            <Button asChild className="flex-1" size="lg">
              <Link href={`/wanted/${id}/offer`}>
                <MessageCircle className="size-4" aria-hidden />
                Poslať ponuku
              </Link>
            </Button>
          ) : (
            <Button asChild className="flex-1" size="lg">
              <Link
                href={`/login?next=${encodeURIComponent(`/wanted/${id}/offer`)}`}
              >
                <MessageCircle className="size-4" aria-hidden />
                Poslať ponuku
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
