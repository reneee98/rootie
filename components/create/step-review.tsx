"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import { getConditionLabel, getSizeLabel } from "@/lib/listing-labels";
import { parseEuroAmountStrict } from "@/lib/money-validation";
import type { ListingDraft, StepErrors } from "./wizard-shell";

/* ------------------------------------------------------------------ */
/* Label maps                                                          */
/* ------------------------------------------------------------------ */

const DURATION_LABELS: Record<string, string> = {
  "24h": "24 hodín",
  "48h": "48 hodín",
  "7d": "7 dní",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type Props = {
  draft: ListingDraft;
  errors: StepErrors;
  publishError: string;
  onGoToStep: (step: number) => void;
};

export function StepReview({ draft, errors, publishError, onGoToStep }: Props) {
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-base font-semibold text-[#232711]">Zhrnutie</h2>
        <p className="text-sm text-[#67635c]">
          Skontrolujte inzerát pred zverejnením.
        </p>
      </div>

      {/* Photos preview */}
      {draft.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {draft.photos.map((photo, i) => (
            <div
              key={photo.storagePath}
              className="relative size-20 shrink-0 overflow-hidden rounded-[12px] border border-[#e9e2d1] bg-muted"
            >
              <Image
                fill
                src={photo.url}
                alt={`Fotka ${i + 1}`}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Summary rows */}
      <div className="rootie-surface space-y-3 rounded-[16px] border-[#e9e2d1] p-4 shadow-none">
        <SummaryRow
          label="Typ"
          value={
            <div className="flex items-center gap-1.5">
              <span>
                {draft.type === "fixed" ? "Pevná cena" : "Aukcia"}
              </span>
              {draft.swapEnabled && (
                <Badge variant="secondary" className="text-[10px]">
                  Výmena
                </Badge>
              )}
            </div>
          }
          onEdit={() => onGoToStep(0)}
        />

        <SummaryRow
          label="Fotky"
          value={`${draft.photos.length} fotiek`}
          hasError={!!errors.photos}
          onEdit={() => onGoToStep(1)}
        />

        <SummaryRow
          label="Rastlina"
          value={draft.plantName || "—"}
          hasError={!!errors.plantName}
          onEdit={() => onGoToStep(2)}
        />

        <SummaryRow
          label="Kraj"
          value={draft.region || "—"}
          hasError={!!errors.region}
          onEdit={() => onGoToStep(3)}
        />

        {draft.district && (
          <SummaryRow label="Okres" value={draft.district} />
        )}

        {draft.condition && (
          <SummaryRow
            label="Stav"
            value={getConditionLabel(draft.condition)}
          />
        )}

        {draft.size && (
          <SummaryRow
            label="Veľkosť"
            value={getSizeLabel(draft.size)}
          />
        )}

        {draft.notes && (
          <SummaryRow
            label="Poznámky"
            value={
              <span className="text-sm line-clamp-2">{draft.notes}</span>
            }
          />
        )}

        {/* Pricing */}
        {draft.type === "fixed" ? (
          <SummaryRow
            label="Cena"
            value={
              draft.fixedPrice
                ? formatPrice(parseEuroAmountStrict(draft.fixedPrice) ?? 0)
                : "—"
            }
            hasError={!!errors.fixedPrice}
            onEdit={() => onGoToStep(4)}
          />
        ) : (
          <>
            <SummaryRow
              label="Začiatočná cena"
              value={
                draft.auctionStartPrice
                  ? formatPrice(parseEuroAmountStrict(draft.auctionStartPrice) ?? 0)
                  : "—"
              }
              hasError={!!errors.auctionStartPrice}
              onEdit={() => onGoToStep(4)}
            />
            <SummaryRow
              label="Min. príhoz"
              value={
                draft.auctionMinIncrement
                  ? formatPrice(parseEuroAmountStrict(draft.auctionMinIncrement) ?? 0)
                  : "—"
              }
              hasError={!!errors.auctionMinIncrement}
              onEdit={() => onGoToStep(4)}
            />
            <SummaryRow
              label="Trvanie"
              value={
                DURATION_LABELS[draft.auctionDuration] || draft.auctionDuration
              }
              onEdit={() => onGoToStep(4)}
            />
          </>
        )}
      </div>

      {/* Validation / publish errors */}
      {(hasErrors || publishError) && (
        <div className="rounded-[14px] border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-sm text-destructive font-medium">
            {publishError || "Opravte chyby v predchádzajúcich krokoch."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper row                                                          */
/* ------------------------------------------------------------------ */

function SummaryRow({
  label,
  value,
  hasError,
  onEdit,
}: {
  label: string;
  value: React.ReactNode;
  hasError?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p
          className={`text-xs font-medium ${
            hasError ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        <div className="text-sm">{value}</div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-0.5 min-h-11 shrink-0 rounded-full bg-[#eef4e5] px-2.5 py-1 text-[11px] font-semibold text-[#4f5826]"
        >
          Upraviť
        </button>
      )}
    </div>
  );
}
