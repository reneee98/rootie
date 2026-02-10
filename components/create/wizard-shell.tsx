"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StepType } from "./step-type";
import { StepPhotos } from "./step-photos";
import { StepPlant } from "./step-plant";
import { StepDetails } from "./step-details";
import { StepPricing } from "./step-pricing";
import { StepReview } from "./step-review";
import { publishListing } from "@/lib/actions/create-listing";
import type { CreateListingInput } from "@/lib/actions/create-listing";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DraftPhoto = {
  url: string;
  storagePath: string;
};

export type ListingDraft = {
  type: "fixed" | "auction";
  swapEnabled: boolean;
  category: "plant" | "accessory";
  photos: DraftPhoto[];
  plantName: string;
  plantTaxonId: string | null;
  region: string;
  district: string;
  condition: string;
  size: string;
  notes: string;
  fixedPrice: string;
  auctionStartPrice: string;
  auctionMinIncrement: string;
  auctionDuration: "24h" | "48h" | "7d";
};

export type StepErrors = Record<string, string>;

export type StepProps = {
  draft: ListingDraft;
  updateDraft: (updates: Partial<ListingDraft>) => void;
  errors: StepErrors;
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "rootie_listing_draft";
const TOTAL_STEPS = 6;

const STEP_LABELS = [
  "Typ inzerátu",
  "Fotky",
  "Rastlina",
  "Detaily",
  "Cena",
  "Zhrnutie",
];

const DEFAULT_DRAFT: ListingDraft = {
  type: "fixed",
  swapEnabled: false,
  category: "plant",
  photos: [],
  plantName: "",
  plantTaxonId: null,
  region: "",
  district: "",
  condition: "",
  size: "",
  notes: "",
  fixedPrice: "",
  auctionStartPrice: "",
  auctionMinIncrement: "1",
  auctionDuration: "24h",
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function validateStep(step: number, draft: ListingDraft): StepErrors {
  const errors: StepErrors = {};

  switch (step) {
    case 0:
      break;

    case 1:
      if (draft.photos.length === 0) {
        errors.photos = "Pridajte aspoň jednu fotku.";
      }
      break;

    case 2:
      if (!draft.plantName.trim()) {
        errors.plantName = "Zadajte názov rastliny.";
      }
      break;

    case 3:
      if (!draft.region) {
        errors.region = "Vyberte kraj.";
      }
      break;

    case 4:
      if (draft.type === "fixed") {
        const price = parseFloat(draft.fixedPrice);
        if (!draft.fixedPrice || isNaN(price) || price <= 0) {
          errors.fixedPrice = "Zadajte platnú cenu.";
        }
      } else {
        const start = parseFloat(draft.auctionStartPrice);
        if (!draft.auctionStartPrice || isNaN(start) || start <= 0) {
          errors.auctionStartPrice = "Zadajte platnú začiatočnú cenu.";
        }
        const incr = parseFloat(draft.auctionMinIncrement);
        if (!draft.auctionMinIncrement || isNaN(incr) || incr <= 0) {
          errors.auctionMinIncrement = "Zadajte platný minimálny príhoz.";
        }
      }
      break;

    default:
      break;
  }

  return errors;
}

function validateAll(draft: ListingDraft): StepErrors {
  let allErrors: StepErrors = {};
  for (let i = 0; i < TOTAL_STEPS - 1; i++) {
    allErrors = { ...allErrors, ...validateStep(i, draft) };
  }
  return allErrors;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type Props = {
  userId: string;
  defaultRegion: string;
};

export function WizardShell({ userId, defaultRegion }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>(DEFAULT_DRAFT);
  const [errors, setErrors] = useState<StepErrors>({});
  const [isPublishing, startPublishing] = useTransition();
  const [publishError, setPublishError] = useState("");
  const [loaded, setLoaded] = useState(false);

  /* Load from localStorage on mount */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ListingDraft>;
        setDraft((prev) => ({ ...prev, ...parsed }));
      } else if (defaultRegion) {
        setDraft((prev) => ({ ...prev, region: defaultRegion }));
      }
    } catch {
      if (defaultRegion) {
        setDraft((prev) => ({ ...prev, region: defaultRegion }));
      }
    }
    setLoaded(true);
  }, [defaultRegion]);

  /* Autosave to localStorage */
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* localStorage full or unavailable — ignore */
    }
  }, [draft, loaded]);

  const updateDraft = useCallback((updates: Partial<ListingDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
    /* Clear related field errors */
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(updates)) {
        delete next[key];
      }
      return next;
    });
  }, []);

  /* Navigation */
  const handleNext = () => {
    const stepErrors = validateStep(step, draft);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToStep = (target: number) => {
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Publish */
  const handlePublish = () => {
    const allErrors = validateAll(draft);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setPublishError("Skontrolujte povinné polia v predchádzajúcich krokoch.");
      return;
    }

    setPublishError("");
    startPublishing(async () => {
      let auctionEndsAt: string | null = null;
      if (draft.type === "auction") {
        const now = new Date();
        const durationMs: Record<string, number> = {
          "24h": 24 * 60 * 60 * 1000,
          "48h": 48 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
        };
        auctionEndsAt = new Date(
          now.getTime() + (durationMs[draft.auctionDuration] ?? durationMs["24h"])
        ).toISOString();
      }

      const input: CreateListingInput = {
        type: draft.type,
        swapEnabled: draft.swapEnabled,
        category: draft.category,
        plantName: draft.plantName,
        plantTaxonId: draft.plantTaxonId,
        condition: draft.condition,
        size: draft.size,
        notes: draft.notes,
        region: draft.region,
        district: draft.district,
        fixedPrice:
          draft.type === "fixed" ? parseFloat(draft.fixedPrice) : null,
        auctionStartPrice:
          draft.type === "auction"
            ? parseFloat(draft.auctionStartPrice)
            : null,
        auctionMinIncrement:
          draft.type === "auction"
            ? parseFloat(draft.auctionMinIncrement)
            : null,
        auctionEndsAt,
        photoUrls: draft.photos.map((p) => p.url),
      };

      const result = await publishListing(input);

      if (!result.ok) {
        setPublishError(result.error);
        return;
      }

      /* Clear draft and redirect */
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/listing/${result.listingId}`);
    });
  };

  /* Clear draft */
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setDraft({ ...DEFAULT_DRAFT, region: defaultRegion });
    setStep(0);
    setErrors({});
    setPublishError("");
  };

  /* Loading state (avoid hydration mismatch with localStorage) */
  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  /* ---- Render current step ---- */
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepType draft={draft} updateDraft={updateDraft} errors={errors} />
        );
      case 1:
        return (
          <StepPhotos
            draft={draft}
            updateDraft={updateDraft}
            errors={errors}
            userId={userId}
          />
        );
      case 2:
        return (
          <StepPlant draft={draft} updateDraft={updateDraft} errors={errors} />
        );
      case 3:
        return (
          <StepDetails
            draft={draft}
            updateDraft={updateDraft}
            errors={errors}
          />
        );
      case 4:
        return (
          <StepPricing
            draft={draft}
            updateDraft={updateDraft}
            errors={errors}
          />
        );
      case 5:
        return (
          <StepReview
            draft={draft}
            errors={errors}
            publishError={publishError}
            onGoToStep={handleGoToStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col">
      {/* ---- Progress header ---- */}
      <div className="px-0 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Nový inzerát</h1>
          {(draft.plantName || draft.photos.length > 0) && (
            <button
              onClick={handleClearDraft}
              className="text-xs text-muted-foreground underline"
              type="button"
            >
              Vymazať koncept
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Krok {step + 1} z {TOTAL_STEPS} &ndash; {STEP_LABELS[step]}
        </p>
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1 py-6 pb-24">{renderStep()}</div>

      {/* ---- Fixed footer navigation ---- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
        <div className="mx-auto max-w-md px-4 py-3 flex gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              type="button"
              className={`h-12 rounded-lg border border-input text-sm font-medium ${
                step === TOTAL_STEPS - 1 ? "w-auto px-6" : "flex-1"
              }`}
            >
              Späť
            </button>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={handleNext}
              type="button"
              className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Ďalej
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              type="button"
              className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {isPublishing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Zverejňujem...
                </span>
              ) : (
                "Zverejniť inzerát"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
