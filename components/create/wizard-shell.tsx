"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { StepType } from "./step-type";
import { StepPhotos } from "./step-photos";
import { StepPlant } from "./step-plant";
import { StepDetails } from "./step-details";
import { StepPricing } from "./step-pricing";
import { StepReview } from "./step-review";
import { publishListing } from "@/lib/actions/create-listing";
import type { CreateListingInput } from "@/lib/actions/create-listing";
import { parseEuroAmountStrict } from "@/lib/money-validation";
import { DEFAULT_DRAFT, TOTAL_STEPS, getDraftStorageKey, restoreDraft, validateStep, validateAll, type ListingDraft, type StepErrors } from "./listing-draft";
export type { DraftPhoto, ListingDraft, StepErrors } from "./listing-draft";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type StepProps = {
  draft: ListingDraft;
  updateDraft: (updates: Partial<ListingDraft>) => void;
  errors: StepErrors;
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "rootie_listing_draft";

const STEP_LABELS = [
  "Typ inzerátu",
  "Fotky",
  "Rastlina",
  "Detaily",
  "Cena",
  "Zhrnutie",
];

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

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
  const [isUploading, setIsUploading] = useState(false);
  const storageKey = getDraftStorageKey(userId);

  /* Load from localStorage on mount — setState inside effect is intentional (SSR constraint) */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(restoreDraft(JSON.parse(saved), userId, defaultRegion));
      } else {
        const legacySaved = localStorage.getItem(STORAGE_KEY);
        const legacyDraft = legacySaved ? restoreDraft(JSON.parse(legacySaved), userId, defaultRegion) : null;
        // Migrate only drafts whose uploaded photos establish this account as the owner.
        if (legacyDraft?.photos.length) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(legacyDraft));
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // Preserve the original draft if browser storage cannot save the migrated one.
          }
        }
        setDraft(legacyDraft?.photos.length ? legacyDraft : { ...DEFAULT_DRAFT, region: defaultRegion });
      }
    } catch {
      if (defaultRegion) {
        setDraft((prev) => ({ ...prev, region: defaultRegion }));
      }
    }
    setLoaded(true);
  }, [defaultRegion, storageKey, userId]);

  /* Autosave to localStorage */
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      /* localStorage full or unavailable — ignore */
    }
  }, [draft, loaded, storageKey]);

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
    if (isUploading || isPublishing) return;
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
    if (isUploading || isPublishing) return;
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToStep = (target: number) => {
    if (isPublishing) return;
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Publish */
  const handlePublish = () => {
    if (isPublishing || isUploading) return;
    const allErrors = validateAll(draft);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setPublishError("Skontrolujte povinné polia v predchádzajúcich krokoch.");
      return;
    }

    setPublishError("");
    startPublishing(async () => {
      try {
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
            draft.type === "fixed" ? parseEuroAmountStrict(draft.fixedPrice) : null,
          auctionStartPrice:
            draft.type === "auction"
              ? parseEuroAmountStrict(draft.auctionStartPrice)
              : null,
          auctionMinIncrement:
            draft.type === "auction"
              ? parseEuroAmountStrict(draft.auctionMinIncrement)
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
          localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        router.push(`/listing/${result.listingId}`);
      } catch {
        setPublishError("Inzerát sa nepodarilo zverejniť. Skúste to znova.");
      }
    });
  };

  /* Clear draft */
  const handleClearDraft = () => {
    if (isUploading || isPublishing) return;
    try {
      localStorage.removeItem(storageKey);
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
      <div className="rootie-surface flex min-h-[50dvh] items-center justify-center rounded-[18px] border-[#e9e2d1]">
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
            onUploadingChange={setIsUploading}
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
    <div className="rootie-page pb-0">
      <header className="rootie-page-header space-y-3 border border-[#e9e2d1] bg-[#faf8f4] shadow-none">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e9e2d1] bg-[#f2ede2] text-[#67635c] hover:bg-[#ece6d8] hover:text-[#232711]"
            aria-label="Späť na domov"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          {(draft.plantName || draft.photos.length > 0) && (
            <button
              onClick={handleClearDraft}
              disabled={isUploading || isPublishing}
              className="text-xs font-medium text-[#67635c] underline underline-offset-2"
              type="button"
            >
              Vymazať koncept
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="rootie-page-eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#4f5826]" aria-hidden />
            Pridať inzerát
          </p>
          <h1 className="rootie-page-title">Nový inzerát</h1>
          <p className="rootie-page-description">
            Krok {step + 1} z {TOTAL_STEPS} • {STEP_LABELS[step]}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[#4f5826]" : "bg-[#e3dccd]"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="pb-28">
        <section className="rootie-surface rounded-[18px] border-[#e9e2d1] p-4 shadow-none">
          {renderStep()}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9e2d1] bg-transparent">
        <div className="mx-auto flex w-full max-w-md gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {step > 0 ? (
            <button
              onClick={handleBack}
              disabled={isUploading || isPublishing}
              type="button"
              className={`h-12 rounded-[18px] border border-[#e9e2d1] bg-[#faf8f4] px-4 text-sm font-semibold text-[#232711] shadow-none ${
                step === TOTAL_STEPS - 1 ? "w-auto px-6" : "flex-1"
              }`}
            >
              Späť
            </button>
          ) : null}

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={handleNext}
              disabled={isUploading || isPublishing}
              type="button"
              className="h-12 flex-1 rounded-[18px] bg-[#4f5826] text-sm font-semibold text-[#faf8f4] shadow-[0_3px_10px_rgba(35,39,17,0.16)]"
            >
              {isUploading ? "Nahrávam fotky…" : "Ďalej"}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              type="button"
              className="h-12 flex-1 rounded-[18px] bg-[#4f5826] text-sm font-semibold text-[#faf8f4] shadow-[0_3px_10px_rgba(35,39,17,0.16)] disabled:opacity-50"
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
