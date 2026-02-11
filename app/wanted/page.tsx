import { Suspense } from "react";
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

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): WantedFeedFiltersType {
  const str = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v : undefined;
  };
  const regionRaw = str("region");
  return {
    region:
      regionRaw && regionRaw !== "All Slovakia"
        ? regionRaw
        : undefined,
    query: str("q"),
    intent: (str("intent") as WantedFeedFiltersType["intent"]) ?? undefined,
    page: str("page") ? Number(str("page")) : 1,
  };
}

export default async function WantedPage({ searchParams }: WantedPageProps) {
  const rawParams = await searchParams;
  const filters = parseSearchParams(rawParams);
  const { items, hasMore } = await getWantedFeed(filters);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Hľadám</h1>
        <Button asChild size="sm">
          <Link href="/wanted/create">
            <Plus className="size-4" aria-hidden />
            Pridať
          </Link>
        </Button>
      </div>

      <Suspense>
        <WantedFilters />
      </Suspense>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Žiadne požiadavky pre zvolené filtre.
          </p>
          <p className="text-muted-foreground text-xs">
            Skúste zmeniť kraj alebo vyhľadávanie.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/wanted/create">Vytvoriť požiadavku</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3" role="list">
            {items.map((item) => (
              <WantedFeedCard key={item.id} item={item} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href={buildWantedPageUrl(filters, (filters.page ?? 1) + 1)}>
                  Ďalšie
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
