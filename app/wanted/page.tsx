import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { WantedFilters } from "@/components/wanted/wanted-filters";
import { WantedFeedCard } from "@/components/wanted/wanted-feed-card";
import {
  getWantedFeed,
  type WantedFeedFilters as WantedFeedFiltersType,
} from "@/lib/data/wanted";
import { Button } from "@/components/ui/button";

function buildWantedPageUrl(
  filters: WantedFeedFiltersType,
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.query) params.set("q", filters.query);
  if (filters.intent) params.set("intent", filters.intent);
  params.set("page", String(page));
  return `/wanted?${params.toString()}`;
}

type WantedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function SectionLabel({
  iconSrc,
  label,
  count,
}: {
  iconSrc: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex h-[21px] items-center gap-[7px]">
      <Image src={iconSrc} alt="" width={18} height={18} className="size-[17.5px]" />
      <p className="text-[12px] font-medium leading-[21px] tracking-[0.04em] text-[#232711] uppercase">
        {label}
      </p>
      <p className="text-[12.25px] leading-[17.5px] text-[#c8c2b4]">({count})</p>
    </div>
  );
}

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): WantedFeedFiltersType {
  const str = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v : undefined;
  };
  return {
    region: str("region"),
    query: str("q"),
    intent: ["buy", "swap", "both"].includes(str("intent") ?? "") ? str("intent") as WantedFeedFiltersType["intent"] : undefined,
    page: Number.isSafeInteger(Number(str("page"))) && Number(str("page")) > 0 ? Number(str("page")) : 1,
  };
}

export default async function WantedPage({ searchParams }: WantedPageProps) {
  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);
  const { items, hasMore } = await getWantedFeed(filters);

  return (
    <div className="space-y-[12px] pb-24">
      <section className="relative overflow-hidden rounded-[18px] border-2 border-[#c4c35b]/20 bg-[#faf8f4] p-4 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 120% at 110% -10%, rgba(196,195,91,0.28) 0%, rgba(250,248,244,0) 58%), radial-gradient(100% 100% at -20% 120%, rgba(79,88,38,0.12) 0%, rgba(250,248,244,0) 64%)",
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex h-[21px] items-center gap-[7px]">
              <Image src="/figma-home/section-new.svg" alt="" width={18} height={18} className="size-[17.5px]" />
              <p className="text-[12px] font-medium leading-[21px] tracking-[0.04em] text-[#232711] uppercase">
                Hľadám rastliny
              </p>
            </div>
            <h1 className="text-[20px] font-semibold leading-[24px] text-[#232711]">Požiadavky komunity</h1>
            <p className="text-[13px] leading-[18px] text-[#67635c]">
              Ľudia tu hľadajú konkrétne rastliny a výmeny.
            </p>
          </div>

          <Button
            asChild
            size="sm"
            className="self-center h-[36px] rounded-[14px] px-3 text-[12px] text-[#c4c35b] hover:text-[#c4c35b]"
          >
            <Link href="/wanted/create">
              <Plus className="size-4" aria-hidden />
              Pridať
            </Link>
          </Button>
        </div>
      </section>

      <Suspense>
        <WantedFilters />
      </Suspense>

      {items.length === 0 ? (
        <section className="px-[2px] py-[4px]">
          <div className="rounded-[14px] bg-[#faf8f4] p-5 text-center shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
            <p className="text-[16px] font-semibold leading-[21px] text-[#232711]">
              Žiadne požiadavky pre zvolené filtre
            </p>
            <p className="mt-1 text-[13px] leading-[18px] text-[#5a6e5a]">
              Skús zmeniť kraj alebo vyhľadávanie.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/wanted/create">Vytvoriť požiadavku</Link>
            </Button>
            {(filters.page ?? 1) > 1 ? (
              <Button asChild variant="outline" size="sm" className="mt-3 ml-2">
                <Link href={buildWantedPageUrl(filters, (filters.page ?? 1) - 1)}>Predchádzajúce</Link>
              </Button>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-[12px]" role="list">
            <SectionLabel iconSrc="/figma-home/section-new.svg" label="Hľadám teraz" count={items.length} />
            <div className="grid grid-cols-2 gap-[10.5px]">
              {items.map((item) => (
                <WantedFeedCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {(hasMore || (filters.page ?? 1) > 1) && (
            <div className="flex justify-center">
              {(filters.page ?? 1) > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildWantedPageUrl(filters, (filters.page ?? 1) - 1)}>Predchádzajúce</Link>
                </Button>
              ) : null}
              {hasMore ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildWantedPageUrl(filters, (filters.page ?? 1) + 1)}>
                  Ďalšie
                </Link>
              </Button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
