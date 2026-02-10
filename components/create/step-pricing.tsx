"use client";

import { Euro } from "lucide-react";
import type { StepProps } from "./wizard-shell";

const DURATION_PRESETS = [
  { value: "24h" as const, label: "24 hodín" },
  { value: "48h" as const, label: "48 hodín" },
  { value: "7d" as const, label: "7 dní" },
];

export function StepPricing({ draft, updateDraft, errors }: StepProps) {
  if (draft.type === "fixed") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold mb-1">Cena</h2>
          <p className="text-sm text-muted-foreground">
            Zadajte cenu, za ktorú chcete rastlinu predať.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fixedPrice" className="text-sm font-medium">
            Cena (€) <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              id="fixedPrice"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={draft.fixedPrice}
              onChange={(e) => updateDraft({ fixedPrice: e.target.value })}
              placeholder="0"
              className={`h-14 w-full rounded-lg border bg-background pl-10 pr-4 text-xl font-semibold outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] ${
                errors.fixedPrice ? "border-destructive" : "border-input"
              }`}
              aria-invalid={!!errors.fixedPrice}
            />
          </div>
          {errors.fixedPrice && (
            <p className="text-sm text-destructive">{errors.fixedPrice}</p>
          )}
        </div>
      </div>
    );
  }

  /* Auction pricing */
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1">Nastavenie aukcie</h2>
        <p className="text-sm text-muted-foreground">
          Zadajte začiatočnú cenu a parametre aukcie.
        </p>
      </div>

      {/* Start price */}
      <div className="space-y-1.5">
        <label htmlFor="auctionStartPrice" className="text-sm font-medium">
          Začiatočná cena (€) <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            id="auctionStartPrice"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={draft.auctionStartPrice}
            onChange={(e) =>
              updateDraft({ auctionStartPrice: e.target.value })
            }
            placeholder="0"
            className={`h-14 w-full rounded-lg border bg-background pl-10 pr-4 text-xl font-semibold outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] ${
              errors.auctionStartPrice ? "border-destructive" : "border-input"
            }`}
            aria-invalid={!!errors.auctionStartPrice}
          />
        </div>
        {errors.auctionStartPrice && (
          <p className="text-sm text-destructive">
            {errors.auctionStartPrice}
          </p>
        )}
      </div>

      {/* Min increment */}
      <div className="space-y-1.5">
        <label htmlFor="auctionMinIncrement" className="text-sm font-medium">
          Min. príhoz (€) <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            id="auctionMinIncrement"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={draft.auctionMinIncrement}
            onChange={(e) =>
              updateDraft({ auctionMinIncrement: e.target.value })
            }
            placeholder="1"
            className={`h-12 w-full rounded-lg border bg-background pl-10 pr-4 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] ${
              errors.auctionMinIncrement
                ? "border-destructive"
                : "border-input"
            }`}
            aria-invalid={!!errors.auctionMinIncrement}
          />
        </div>
        {errors.auctionMinIncrement && (
          <p className="text-sm text-destructive">
            {errors.auctionMinIncrement}
          </p>
        )}
      </div>

      {/* Duration presets */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium">
          Trvanie aukcie <span className="text-destructive">*</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => updateDraft({ auctionDuration: preset.value })}
              className={`h-12 rounded-lg border-2 text-sm font-medium transition-colors ${
                draft.auctionDuration === preset.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
              aria-pressed={draft.auctionDuration === preset.value}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
