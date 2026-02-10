"use client";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/formatters";
import { getConditionLabel, getSizeLabel } from "@/lib/listing-labels";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1">Zhrnutie</h2>
        <p className="text-sm text-muted-foreground">
          Skontrolujte inzerát pred zverejnením.
        </p>
      </div>

      {/* Photos preview */}
      {draft.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {draft.photos.map((photo, i) => (
            <div
              key={photo.storagePath}
              className="relative shrink-0 size-20 rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={photo.url}
                alt={`Fotka ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Summary rows */}
      <div className="space-y-3 rounded-xl border p-4">
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
                ? formatPrice(parseFloat(draft.fixedPrice))
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
                  ? formatPrice(parseFloat(draft.auctionStartPrice))
                  : "—"
              }
              hasError={!!errors.auctionStartPrice}
              onEdit={() => onGoToStep(4)}
            />
            <SummaryRow
              label="Min. príhoz"
              value={
                draft.auctionMinIncrement
                  ? formatPrice(parseFloat(draft.auctionMinIncrement))
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
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
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
          className="text-xs text-primary underline shrink-0 mt-0.5"
        >
          Upraviť
        </button>
      )}
    </div>
  );
}
