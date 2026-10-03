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
  const searchVersionRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (term: string, version: number) => {
    try {
      const data = await searchPlantTaxa(term);
      if (version !== searchVersionRef.current) return;
      setResults(data);
      setShowDropdown(data.length > 0);
    } catch {
      if (version === searchVersionRef.current) setResults([]);
    } finally {
      if (version === searchVersionRef.current) setIsSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    updateDraft({ plantName: value, plantTaxonId: null });
    const version = ++searchVersionRef.current;
    setResults([]);
    setShowDropdown(false);
    setIsSearching(value.trim().length >= 2);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (value.trim().length >= 2) {
      timeoutRef.current = setTimeout(() => handleSearch(value, version), 300);
    }
  };

  const handleSelectTaxon = (taxon: PlantTaxonResult) => {
    searchVersionRef.current += 1;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsSearching(false);
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
        searchVersionRef.current += 1;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSearching(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Cleanup timeout */
  useEffect(() => {
    return () => {
      searchVersionRef.current += 1;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-base font-semibold text-[#232711]">Názov rastliny</h2>
        <p className="text-sm text-[#67635c]">
          Začnite písať a vyberte z návrhov, alebo zadajte vlastný názov.
        </p>
      </div>

      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#878379]" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowDropdown(true);
            }}
            placeholder="napr. Monstera deliciosa"
            className={`rootie-field h-12 border-[#e9e2d1] bg-[#faf8f4] pl-10 pr-4 text-base ${
              errors.plantName ? "border-destructive" : ""
            }`}
            aria-label="Názov rastliny"
            aria-invalid={!!errors.plantName}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="plant-autocomplete-listbox"
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
            id="plant-autocomplete-listbox"
            role="listbox"
            className="rootie-surface absolute z-20 mt-1 max-h-60 w-full overflow-y-auto"
          >
            {results.map((taxon) => (
              <button
                key={taxon.id}
                type="button"
                role="option"
                aria-selected={draft.plantTaxonId === taxon.id}
                onClick={() => handleSelectTaxon(taxon)}
                className="flex w-full items-center gap-3 border-b border-[#f0e9d9] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f3efe6]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {taxon.canonical_name}
                  </p>
                  {taxon.synonyms.length > 0 && (
                    <p className="truncate text-xs text-[#67635c]">
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4e5] px-3 py-1.5 text-xs font-medium text-[#4f5826]">
          <Check className="size-3.5" />
          Prepojené s databázou rastlín
        </div>
      )}

      {/* Error */}
      {errors.plantName && (
        <p className="text-sm text-destructive">{errors.plantName}</p>
      )}
    </div>
  );
}
