"use client";

import { Gavel, Tag, ArrowLeftRight } from "lucide-react";
import type { StepProps } from "./wizard-shell";

export function StepType({ draft, updateDraft }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1">Typ predaja</h2>
        <p className="text-sm text-muted-foreground">
          Ako chcete predať vašu rastlinu?
        </p>
      </div>

      {/* Fixed / Auction cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateDraft({ type: "fixed" })}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-colors ${
            draft.type === "fixed"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/30"
          }`}
          aria-label="Pevná cena"
          aria-pressed={draft.type === "fixed"}
        >
          <Tag className="size-8" />
          <div className="text-center">
            <p className="font-semibold text-sm">Pevná cena</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stanovíte jednu cenu
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateDraft({ type: "auction" })}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-colors ${
            draft.type === "auction"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/30"
          }`}
          aria-label="Aukcia"
          aria-pressed={draft.type === "auction"}
        >
          <Gavel className="size-8" />
          <div className="text-center">
            <p className="font-semibold text-sm">Aukcia</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kupujúci prihodia
            </p>
          </div>
        </button>
      </div>

      {/* Swap toggle */}
      <div
        role="switch"
        tabIndex={0}
        aria-checked={draft.swapEnabled}
        aria-label="Otvorený na výmenu"
        onClick={() => updateDraft({ swapEnabled: !draft.swapEnabled })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            updateDraft({ swapEnabled: !draft.swapEnabled });
          }
        }}
        className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
          draft.swapEnabled
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-muted-foreground/30"
        }`}
      >
        <ArrowLeftRight className="size-6 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Otvorený na výmenu</p>
          <p className="text-xs text-muted-foreground">
            Okrem predaja akceptujete aj výmenu rastlín
          </p>
        </div>
        <div
          className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${
            draft.swapEnabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              draft.swapEnabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
