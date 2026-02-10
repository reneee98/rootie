"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, Euro, ArrowLeftRight } from "lucide-react";
import { SLOVAK_REGIONS } from "@/lib/regions";
import { searchPlantTaxa } from "@/lib/actions/plant-search";
import type { PlantTaxonResult } from "@/lib/actions/plant-search";
import { createWanted } from "@/lib/actions/create-wanted";
import { Button } from "@/components/ui/button";

const INTENT_OPTIONS = [
  { value: "buy" as const, label: "Kúpiť" },
  { value: "swap" as const, label: "Vymeniť" },
  { value: "both" as const, label: "Kúpiť aj vymeniť" },
];

const inputClasses =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px]";
const selectClasses =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] appearance-none";

type WantedCreateFormProps = {
  defaultRegion?: string;
};

export function WantedCreateForm({ defaultRegion = "" }: WantedCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [plantName, setPlantName] = useState("");
  const [plantTaxonId, setPlantTaxonId] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");

  useEffect(() => {
    if (defaultRegion) setRegion(defaultRegion);
  }, [defaultRegion]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [intent, setIntent] = useState<"buy" | "swap" | "both">("both");
  const [notes, setNotes] = useState("");

  /* Plant typeahead */
  const [plantQuery, setPlantQuery] = useState("");
  const [plantResults, setPlantResults] = useState<PlantTaxonResult[]>([]);
  const [showPlantDropdown, setShowPlantDropdown] = useState(false);
  const [isSearchingPlant, setIsSearchingPlant] = useState(false);
  const plantTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plantContainerRef = useRef<HTMLDivElement>(null);

  const handlePlantSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setPlantResults([]);
      setShowPlantDropdown(false);
      return;
    }
    setIsSearchingPlant(true);
    const data = await searchPlantTaxa(term);
    setPlantResults(data);
    setShowPlantDropdown(data.length > 0);
    setIsSearchingPlant(false);
  }, []);

  const handlePlantInputChange = (value: string) => {
    setPlantQuery(value);
    setPlantName(value);
    setPlantTaxonId(null);
    if (plantTimeoutRef.current) clearTimeout(plantTimeoutRef.current);
    plantTimeoutRef.current = setTimeout(() => handlePlantSearch(value), 300);
  };

  const handleSelectTaxon = (taxon: PlantTaxonResult) => {
    setPlantQuery(taxon.canonical_name);
    setPlantName(taxon.canonical_name);
    setPlantTaxonId(taxon.id);
    setShowPlantDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        plantContainerRef.current &&
        !plantContainerRef.current.contains(e.target as Node)
      ) {
        setShowPlantDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (plantTimeoutRef.current) clearTimeout(plantTimeoutRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createWanted({
        plantName,
        plantTaxonId,
        region,
        district,
        budgetMin,
        budgetMax,
        negotiable,
        intent,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/wanted/${result.wantedId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold mb-1">Čo hľadáte</h2>
        <p className="text-sm text-muted-foreground">
          Názov rastliny (môžete vybrať z návrhov alebo zadať vlastný).
        </p>
      </div>

      <div ref={plantContainerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={plantQuery}
            onChange={(e) => handlePlantInputChange(e.target.value)}
            onFocus={() => plantResults.length > 0 && setShowPlantDropdown(true)}
            placeholder="napr. Monstera deliciosa"
            className={`${inputClasses} pl-10 pr-4 ${!plantName && error ? "border-destructive" : ""}`}
            aria-label="Názov rastliny"
            aria-invalid={!plantName && !!error}
            autoComplete="off"
          />
          {isSearchingPlant && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        {showPlantDropdown && (
          <div
            role="listbox"
            className="absolute z-20 mt-1 w-full rounded-lg border bg-background shadow-lg max-h-60 overflow-y-auto"
          >
            {plantResults.map((taxon) => (
              <button
                key={taxon.id}
                type="button"
                role="option"
                onClick={() => handleSelectTaxon(taxon)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {taxon.canonical_name}
                  </p>
                  {taxon.synonyms?.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {taxon.synonyms.slice(0, 2).join(", ")}
                    </p>
                  )}
                </div>
                {plantTaxonId === taxon.id && (
                  <Check className="size-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="region" className="text-sm font-medium">
          Kraj <span className="text-destructive">*</span>
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={selectClasses}
          required
          aria-required
        >
          <option value="">Vyberte kraj</option>
          {SLOVAK_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="district" className="text-sm font-medium">
          Okres
        </label>
        <input
          id="district"
          type="text"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="napr. Bratislava III"
          className={inputClasses}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            id="negotiable"
            type="checkbox"
            checked={negotiable}
            onChange={(e) => setNegotiable(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="negotiable" className="text-sm font-medium">
            Rozpočet dohodou
          </label>
        </div>
        {!negotiable && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="budgetMin" className="text-sm font-medium">
                Min (€)
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  id="budgetMin"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="0"
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="budgetMax" className="text-sm font-medium">
                Max (€)
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  id="budgetMax"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="0"
                  className={`${inputClasses} pl-10`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <ArrowLeftRight className="size-4" aria-hidden />
          Úmysel
        </span>
        <div className="flex gap-2 flex-wrap">
          {INTENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setIntent(opt.value)}
              className={`h-11 rounded-lg border-2 px-4 text-sm font-medium transition-colors ${
                intent === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
              aria-pressed={intent === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Poznámky
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Doplňujúce informácie…"
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || !plantName.trim() || !region}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Vytváram…
          </span>
        ) : (
          "Vytvoriť požiadavku"
        )}
      </Button>
    </form>
  );
}
