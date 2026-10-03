"use client";

import { ChevronDown } from "lucide-react";
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

const selectClasses = "rootie-field h-12 appearance-none border-[#e9e2d1] bg-[#faf8f4] pr-10 text-base";

const inputClasses =
  "rootie-field h-12 border-[#e9e2d1] bg-[#faf8f4] text-base";

export function StepDetails({ draft, updateDraft, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-base font-semibold text-[#232711]">Detaily</h2>
        <p className="text-sm text-[#67635c]">
          Kraj je povinný. Ostatné polia sú voliteľné.
        </p>
      </div>

      {/* Region */}
      <div className="space-y-1.5">
        <label htmlFor="region" className="text-sm font-medium">
          Kraj <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <select
            id="region"
            value={draft.region}
            onChange={(e) => updateDraft({ region: e.target.value })}
            className={`${selectClasses} ${errors.region ? "border-destructive" : "border-input"}`}
            aria-invalid={!!errors.region}
          >
            <option value="">Vyberte kraj</option>
            {SLOVAK_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#878379]" />
        </div>
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
        <div className="relative">
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
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#878379]" />
        </div>
      </div>

      {/* Size */}
      <div className="space-y-1.5">
        <label htmlFor="size" className="text-sm font-medium">
          Veľkosť
        </label>
        <div className="relative">
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
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#878379]" />
        </div>
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
          className="rootie-textarea resize-none text-base"
        />
      </div>
    </div>
  );
}
