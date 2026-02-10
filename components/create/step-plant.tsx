"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Check } from "lucide-react";
import { searchPlantTaxa } from "@/lib/actions/plant-search";
import type { PlantTaxonResult } from "@/lib/actions/plant-search";
import type { StepProps } from "./wizard-shell";

export function StepPlant({ draft, updateDraft, errors }: StepProps) {
  const [query, setQuery] = useState(draft.plantName);
  const [results, setResults] = useState<PlantTaxonResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const data = await searchPlantTaxa(term);
    setResults(data);
    setShowDropdown(data.length > 0);
    setIsSearching(false);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    updateDraft({ plantName: value, plantTaxonId: null });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => handleSearch(value), 300);
  };

  const handleSelectTaxon = (taxon: PlantTaxonResult) => {
    setQuery(taxon.canonical_name);
    updateDraft({
      plantName: taxon.canonical_name,
      plantTaxonId: taxon.id,
    });
    setShowDropdown(false);
  };

  /* Close dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Cleanup timeout */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1">Názov rastliny</h2>
        <p className="text-sm text-muted-foreground">
          Začnite písať a vyberte z návrhov, alebo zadajte vlastný názov.
        </p>
      </div>

      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowDropdown(true);
            }}
            placeholder="napr. Monstera deliciosa"
            className={`h-12 w-full rounded-lg border bg-background pl-10 pr-4 text-base outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] ${
              errors.plantName ? "border-destructive" : "border-input"
            }`}
            aria-label="Názov rastliny"
            aria-invalid={!!errors.plantName}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <div
            role="listbox"
            className="absolute z-20 mt-1 w-full rounded-lg border bg-background shadow-lg max-h-60 overflow-y-auto"
          >
            {results.map((taxon) => (
              <button
                key={taxon.id}
                type="button"
                role="option"
                aria-selected={draft.plantTaxonId === taxon.id}
                onClick={() => handleSelectTaxon(taxon)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {taxon.canonical_name}
                  </p>
                  {taxon.synonyms.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {taxon.synonyms.slice(0, 3).join(", ")}
                    </p>
                  )}
                </div>
                {draft.plantTaxonId === taxon.id && (
                  <Check className="size-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected indicator */}
      {draft.plantTaxonId && (
        <p className="text-xs text-primary flex items-center gap-1">
          <Check className="size-3" />
          Prepojené s databázou rastlín
        </p>
      )}

      {/* Error */}
      {errors.plantName && (
        <p className="text-sm text-destructive">{errors.plantName}</p>
      )}
    </div>
  );
}
