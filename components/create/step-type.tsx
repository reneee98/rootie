"use client";

import { Gavel, Tag, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import type { StepProps } from "./wizard-shell";

export function StepType({ draft, updateDraft }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-base font-semibold text-[#232711]">Typ predaja</h2>
        <p className="text-sm text-[#67635c]">
          Ako chcete predať vašu rastlinu?
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#232711]">Kategória</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: "plant", label: "Rastlina" },
            { value: "accessory", label: "Príslušenstvo" },
          ] as const).map((category) => (
            <button
              key={category.value}
              type="button"
              aria-pressed={draft.category === category.value}
              onClick={() => updateDraft({ category: category.value })}
              className={`h-12 rounded-[14px] border px-3 text-sm font-semibold ${draft.category === category.value ? "border-[#4f5826] bg-[#f5f8ef] text-[#4f5826]" : "border-[#e9e2d1] bg-[#faf8f4] text-[#67635c]"}`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fixed / Auction cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateDraft({ type: "fixed" })}
          className={`rootie-surface flex flex-col items-center gap-3 rounded-[16px] border p-5 text-[#232711] shadow-none transition-all hover:-translate-y-0.5 ${
            draft.type === "fixed"
              ? "border-[#4f5826] bg-[#f5f8ef]"
              : "border-[#e9e2d1] bg-[#faf8f4] hover:border-[#d9cfb7]"
          }`}
          aria-label="Pevná cena"
          aria-pressed={draft.type === "fixed"}
        >
          <Tag className={`size-8 ${draft.type === "fixed" ? "text-[#4f5826]" : "text-[#878379]"}`} />
          <div className="text-center">
            <p className="font-semibold text-sm">Pevná cena</p>
            <p className="mt-0.5 text-xs text-[#67635c]">
              Stanovíte jednu cenu
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateDraft({ type: "auction" })}
          className={`rootie-surface flex flex-col items-center gap-3 rounded-[16px] border p-5 text-[#232711] shadow-none transition-all hover:-translate-y-0.5 ${
            draft.type === "auction"
              ? "border-[#4f5826] bg-[#f5f8ef]"
              : "border-[#e9e2d1] bg-[#faf8f4] hover:border-[#d9cfb7]"
          }`}
          aria-label="Aukcia"
          aria-pressed={draft.type === "auction"}
        >
          <Gavel className={`size-8 ${draft.type === "auction" ? "text-[#4f5826]" : "text-[#878379]"}`} />
          <div className="text-center">
            <p className="font-semibold text-sm">Aukcia</p>
            <p className="mt-0.5 text-xs text-[#67635c]">
              Kupujúci prihodia
            </p>
          </div>
        </button>
      </div>
      <Link href="/wanted/create" className="inline-flex min-h-11 items-center text-sm font-medium text-[#4f5826] underline underline-offset-2">
        Hľadám rastlinu – vytvoriť požiadavku
      </Link>

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
        className={`rootie-surface flex cursor-pointer items-center gap-3 rounded-[16px] border p-4 shadow-none transition-colors ${
          draft.swapEnabled
            ? "border-[#4f5826] bg-[#f5f8ef]"
            : "border-[#e9e2d1] bg-[#faf8f4] hover:border-[#d9cfb7]"
        }`}
      >
        <ArrowLeftRight className={`size-6 shrink-0 ${draft.swapEnabled ? "text-[#4f5826]" : "text-[#878379]"}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#232711]">Otvorený na výmenu</p>
          <p className="text-xs text-[#67635c]">
            Okrem predaja akceptujete aj výmenu rastlín
          </p>
        </div>
        <div
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            draft.swapEnabled ? "bg-[#4f5826]" : "bg-[#ddd6c6]"
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
