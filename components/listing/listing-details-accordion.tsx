"use client";

import { MapPin, Ruler, Leaf, Tag, FileText } from "lucide-react";
import { getConditionLabel, getSizeLabel } from "@/lib/listing-labels";
import { getRegionShortLabel } from "@/lib/regions";
import { cn } from "@/lib/utils";

type ListingDetailsAccordionProps = {
  condition: string | null;
  size: string | null;
  leafCount: number | null;
  notes: string | null;
  region: string;
  district: string | null;
  createdAt: string;
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 py-3 text-sm">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export function ListingDetailsAccordion({
  condition,
  size,
  leafCount,
  notes,
  region,
  district,
  createdAt,
}: ListingDetailsAccordionProps) {
  const localeDate = createdAt
    ? new Date(createdAt).toLocaleDateString("sk-SK", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const location = district
    ? `${getRegionShortLabel(region)}, ${district}`
    : getRegionShortLabel(region);

  return (
    <details
      className="group rounded-xl border bg-card"
      open
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold outline-none [&::-webkit-details-marker]:hidden">
        <span>Detaily</span>
        <span
          className="text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        >
          ▼
        </span>
      </summary>
      <div className="border-t px-4">
        {condition && (
          <DetailRow icon={Tag} label="Stav" value={getConditionLabel(condition)} />
        )}
        {size && (
          <DetailRow icon={Ruler} label="Veľkosť" value={getSizeLabel(size)} />
        )}
        {leafCount != null && (
          <DetailRow
            icon={Leaf}
            label="Počet listov"
            value={String(leafCount)}
          />
        )}
        <DetailRow icon={MapPin} label="Lokalita" value={location} />
        {notes?.trim() && (
          <div className="flex gap-3 py-3 text-sm">
            <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs">Poznámka</p>
              <p className="whitespace-pre-wrap font-medium">{notes.trim()}</p>
            </div>
          </div>
        )}
        <div className="text-muted-foreground border-t py-2 text-xs">
          Pridané {localeDate}
        </div>
      </div>
    </details>
  );
}
