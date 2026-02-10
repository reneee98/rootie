"use client";

import { SLOVAK_REGIONS } from "@/lib/regions";
import type { StepProps } from "./wizard-shell";

const CONDITIONS = [
  { value: "", label: "Vyberte stav" },
  { value: "healthy", label: "Zdravá" },
  { value: "slightly_damaged", label: "Mierne poškodená" },
  { value: "needs_care", label: "Potrebuje starostlivosť" },
  { value: "cutting", label: "Odrezok" },
  { value: "seedling", label: "Semenáčik" },
  { value: "rooted_cutting", label: "Zakorenený odrezok" },
] as const;

const SIZES = [
  { value: "", label: "Vyberte veľkosť" },
  { value: "mini", label: "Mini (do 10 cm)" },
  { value: "small", label: "Malá (10–25 cm)" },
  { value: "medium", label: "Stredná (25–50 cm)" },
  { value: "large", label: "Veľká (50–100 cm)" },
  { value: "xl", label: "XL (nad 100 cm)" },
] as const;

const selectClasses =
  "h-12 w-full rounded-lg border bg-background px-3 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] appearance-none";

const inputClasses =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px]";

export function StepDetails({ draft, updateDraft, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-1">Detaily</h2>
        <p className="text-sm text-muted-foreground">
          Kraj je povinný. Ostatné polia sú voliteľné.
        </p>
      </div>

      {/* Region */}
      <div className="space-y-1.5">
        <label htmlFor="region" className="text-sm font-medium">
          Kraj <span className="text-destructive">*</span>
        </label>
        <select
          id="region"
          value={draft.region}
          onChange={(e) => updateDraft({ region: e.target.value })}
          className={`${selectClasses} ${
            errors.region ? "border-destructive" : "border-input"
          }`}
          aria-invalid={!!errors.region}
        >
          <option value="">Vyberte kraj</option>
          {SLOVAK_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {errors.region && (
          <p className="text-sm text-destructive">{errors.region}</p>
        )}
      </div>

      {/* District */}
      <div className="space-y-1.5">
        <label htmlFor="district" className="text-sm font-medium">
          Okres
        </label>
        <input
          id="district"
          type="text"
          value={draft.district}
          onChange={(e) => updateDraft({ district: e.target.value })}
          placeholder="napr. Bratislava III"
          className={inputClasses}
        />
      </div>

      {/* Condition */}
      <div className="space-y-1.5">
        <label htmlFor="condition" className="text-sm font-medium">
          Stav rastliny
        </label>
        <select
          id="condition"
          value={draft.condition}
          onChange={(e) => updateDraft({ condition: e.target.value })}
          className={`${selectClasses} border-input`}
        >
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size */}
      <div className="space-y-1.5">
        <label htmlFor="size" className="text-sm font-medium">
          Veľkosť
        </label>
        <select
          id="size"
          value={draft.size}
          onChange={(e) => updateDraft({ size: e.target.value })}
          className={`${selectClasses} border-input`}
        >
          {SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Poznámky
        </label>
        <textarea
          id="notes"
          value={draft.notes}
          onChange={(e) => updateDraft({ notes: e.target.value })}
          placeholder="Doplňujúce informácie o rastline..."
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] resize-none"
        />
      </div>
    </div>
  );
}
