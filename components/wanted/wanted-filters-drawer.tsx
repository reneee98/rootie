"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { SLOVAK_REGIONS } from "@/lib/regions";

type WantedIntent = "" | "buy" | "swap" | "both";

const INTENT_OPTIONS: { value: WantedIntent; label: string }[] = [
  { value: "", label: "Všetko" },
  { value: "buy", label: "Kúpa" },
  { value: "swap", label: "Výmena" },
  { value: "both", label: "Oboje" },
];

function parseIntent(value: string | null): WantedIntent {
  if (value === "buy" || value === "swap" || value === "both") return value;
  return "";
}

type WantedFiltersDrawerProps = {
  iconSrc?: string;
  buttonClassName?: string;
};

export function WantedFiltersDrawer({
  iconSrc = "/figma-header/filter-icon.svg",
  buttonClassName,
}: WantedFiltersDrawerProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const currentIntent = parseIntent(searchParams.get("intent"));
  const currentRegion = searchParams.get("region") ?? "";
  const [draftIntent, setDraftIntent] = useState<WantedIntent>(currentIntent);
  const [draftRegion, setDraftRegion] = useState(currentRegion);

  const activeCount = useMemo(() => (currentIntent ? 1 : 0) + (currentRegion ? 1 : 0), [currentIntent, currentRegion]);

  const openDrawer = useCallback(() => {
    setDraftIntent(parseIntent(searchParams.get("intent")));
    setDraftRegion(searchParams.get("region") ?? "");
    setOpen(true);
  }, [searchParams]);

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (draftRegion) params.set("region", draftRegion);
    else params.delete("region");
    if (draftIntent) params.set("intent", draftIntent);
    else params.delete("intent");

    const qs = params.toString();
    router.push(qs ? `/wanted?${qs}` : "/wanted", { scroll: false });
    setOpen(false);
  }, [draftIntent, draftRegion, router, searchParams]);

  const clearAll = useCallback(() => {
    setDraftIntent("");
    setDraftRegion("");
    const params = new URLSearchParams(searchParams.toString());
    ["intent", "page", "region"].forEach((key) => params.delete(key));
    const qs = params.toString();
    router.push(qs ? `/wanted?${qs}` : "/wanted", { scroll: false });
    setOpen(false);
  }, [router, searchParams]);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className={cn(
          "relative flex size-[44px] items-center justify-center rounded-[18px] bg-[#4f5826] shadow-[0_2px_6px_rgba(0,0,0,0.1)]",
          buttonClassName
        )}
        aria-label="Filtre Hľadám"
      >
        <Image src={iconSrc} alt="" width={18} height={18} className="size-[17.5px]" />
        {activeCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fb2c36] px-1 text-[9px] font-bold leading-none text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader className="pb-1 text-left">
            <DrawerTitle>Filtre</DrawerTitle>
            <DrawerDescription className="text-xs">
              Filtruj dopyty v sekcii Hľadám.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[62vh] space-y-4 overflow-y-auto px-4 pb-4">
            <section className="space-y-2">
              <label htmlFor="wanted-filter-region" className="text-sm font-semibold">Kraj</label>
              <select id="wanted-filter-region" value={draftRegion} onChange={(event) => setDraftRegion(event.target.value)} className="rootie-field h-11">
                <option value="">Celé Slovensko</option>
                {SLOVAK_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Úmysel</h3>
              <SegmentedControl
                ariaLabel="Úmysel"
                value={draftIntent}
                onValueChange={setDraftIntent}
                options={INTENT_OPTIONS}
                className="border-[#ded7c6] bg-[#f8f4ec] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] [&_button[aria-selected='false']]:text-[#656057] [&_button[aria-selected='false']]:hover:text-[#232711]"
              />
            </section>
          </div>

          <DrawerFooter className="border-t bg-background pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={clearAll}>
                Vymazať
              </Button>
              <Button type="button" onClick={apply}>
                Zobraziť výsledky
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
